import * as together from 'together-ai';
import * as validation from '@gptmmo/validation';
import * as status from '@gptmmo/status';
import type { Stream } from 'together-ai/streaming';

// This should probably be in the session.
const client = new together.default({
  apiKey: '05a69d8f90399cceadcf77a9fe53b8c25720c071ddfe7c893f7cf76775811f56',
});

export type CompletionStream =
  Stream<together.Together.Chat.ChatCompletionChunk>;

export type Message = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

/**
 * This is currently not type safe. Ideally there is a way to make it so.
 */
export const completePromptJSON = async (args: {
  prompt: string;
  schema: validation.SomeSchema;
  systemContext?: string;
  previousMessages?: Array<Message>;
}): Promise<status.StatusOr<any>> => {
  const { prompt, schema, systemContext, previousMessages } = args;

  let messages: Array<together.Together.Chat.Completions.CompletionCreateParams.Message> =
    [];

  if (systemContext != null) {
    messages.push({ role: 'system', content: systemContext });
  }

  if (previousMessages != null) {
    messages = messages.concat(previousMessages);
  }

  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({
    messages,
    model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    response_format: { type: 'json_object', schema },
  });

  if (response?.choices?.[0]?.message?.content == null) {
    return status.fromError(`No response content for input prompt: ${prompt}`);
  }

  return status.fromValue(JSON.parse(response.choices[0].message.content));
};

export const completePrompt = async (args: {
  prompt: string;
  systemContext?: string;
  previousMessages?: Array<Message>;
}): Promise<CompletionStream> => {
  const { prompt, previousMessages, systemContext } = args;

  let messages: Array<together.Together.Chat.Completions.CompletionCreateParams.Message> =
    [];

  if (systemContext != null) {
    messages.push({ role: 'system', content: systemContext });
  }

  if (previousMessages != null) {
    messages = messages.concat(previousMessages);
  }

  messages.push({ role: 'user', content: prompt });

  return client.chat.completions.create({
    messages,
    model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    stream: true,
  });
};

export const streamToString = async (
  stream: CompletionStream,
): Promise<string> => streamMap(stream, () => {});

export const streamToLog = async (stream: CompletionStream): Promise<string> =>
  streamMap(stream, (chunk) => {
    process.stdout.write(chunk.choices[0].delta.content ?? '');
  });

export const streamMap = async (
  stream: CompletionStream,
  fn: (chunk: together.Together.Chat.ChatCompletionChunk) => void,
): Promise<string> => {
  let result = '';
  for await (const chunk of stream) {
    fn(chunk);
    result += chunk.choices[0].delta.content;
  }
  return result;
};
