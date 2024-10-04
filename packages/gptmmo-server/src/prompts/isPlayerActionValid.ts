import * as completion from '@/lib/completion';
import * as validation from '@gptmmo/validation';
import * as status from '@gptmmo/status';
import * as format from '@/lib/format';

import type * as session from '@/session';

const CONTEXT =
  'You are a game moderator for a text adventure. Your job is to make sure that the player is not able to take actions that would break the game. You should respond with a boolean indicating if the action is valid.';

const PROMPT =
  'The following is the state of the game: <STATE>. The player has entered the following action: <ACTION>. Please respond with a boolean indicating if this is a valid action. Be lenient -- if the player has inventory items that may be used in a creative way, consider that valid. Similarly, if the player chooses to do something stupid (e.g. run into a wall repeatedly), that is also valid. But if the player is trying to do things like ask for help, use items they do not have, interact with things that do not exist, and so on, that is not valid.';

const SCHEMA: validation.Schema<boolean> = {
  type: 'boolean',
};

export const isPlayerActionValid = async (args: {
  action: string;
  session: session.Session;
}): Promise<status.StatusOr<boolean>> => {
  const { action, session } = args;

  const prompt = format.format({
    input: PROMPT,
    params: {
      '<STATE>': session,
      '<ACTION>': action,
    },
  });

  return completion.completePromptJSON({
    prompt,
    schema: SCHEMA,
    systemContext: CONTEXT,
    previousMessages: session?.messages,
  });
};
