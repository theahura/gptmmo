import * as completion from '@/lib/completion';
import * as format from '@/lib/format';
import * as validation from '@gptmmo/validation';
import * as status from '@gptmmo/status';

const PROMPT =
  'Given the following description of a room, what is a good pithy one to two word name for it? <DESCRIPTION>';

const SCHEMA: validation.Schema<string> = {
  type: 'string',
  minLength: 1,
  maxLength: 50,
};

export const roomNameFromDescription = async (args: {
  roomDescription: string;
}): Promise<status.StatusOr<string>> => {
  const { roomDescription } = args;

  return completion.completePromptJSON({
    prompt: format.format({
      input: PROMPT,
      params: { '<DESCRIPTION>': roomDescription },
    }),
    schema: SCHEMA,
  });
};
