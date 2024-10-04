import * as completion from '@/lib/completion';
import * as validation from '@gptmmo/validation';
import * as format from '@/lib/format';
import * as status from '@gptmmo/status';

import type * as session from '@/session';

const CONTEXT =
  'You are a module in a larger text adventure simulator. Given a fixed set of actions that the simulator can take, you decide which actions to take next. Your response will be fed back in as a loop, allowing you to do multiple actions in sequence. Only output your response in JSON. Previous actions taken by the system are denoted with the prefix "ACTION[ACTION-NAME]: ". Previous actions taken by the user are denoted with the prefix "USER: ". The module prompt will be denoted with the prefix "PROMPT: ". Never output prefixes; those will be appended by the system.';

const PROMPT =
  'PROMPT: Which of the following actions should the simulator take next? If the last action was output to the player, you should always choose to prompt the player for their reaction next. <ACTIONS>';

const compiler = validation.createCompiler();

export const actionSwitch = async <T extends { [key: string]: string }>(args: {
  session: session.Session;
  actions: T;
}): Promise<status.StatusOr<keyof T>> => {
  const { session, actions } = args;

  const prompt = format.format({
    input: PROMPT,
    params: {
      '<ACTIONS>': JSON.stringify(actions),
    },
  });

  const actionNames = Object.keys(actions);

  const schema: validation.SomeSchema = {
    type: 'string',
    enum: actionNames,
  };

  const maybeUntypedActionName = await completion.completePromptJSON({
    prompt,
    schema,
    systemContext: CONTEXT,
    previousMessages: session,
  });

  if (!status.isOk(maybeUntypedActionName)) {
    return maybeUntypedActionName;
  }
  const untypedActionName = maybeUntypedActionName.value;

  if (!compiler.validate(schema, untypedActionName)) {
    return status.fromError(
      `Invalid response: ${JSON.stringify(untypedActionName)}`,
    );
  }

  return status.fromValue(untypedActionName as keyof T);
};
