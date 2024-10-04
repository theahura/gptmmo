import * as completion from '@/lib/completion';
import * as format from '@/lib/format';

const PROMPT =
  'Given the following description of a room, what is a good pithy one to two word name for it? <DESCRIPTION>';

export const roomNameFromDescription = (args: { roomDescription: string }) => {
  const { roomDescription } = args;
  return completion.completePrompt({
    prompt: format.format({
      input: PROMPT,
      params: { '<DESCRIPTION>': roomDescription },
    }),
  });
};
