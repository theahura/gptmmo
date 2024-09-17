import * as together from 'together-ai';

import type { Stream } from 'together-ai/streaming';

const client = new together.default({
  apiKey: 'd5aacd884b9e6e53102ec3b36dcb257f274fb4c47ccca4ec084e90c41366225c',
});

export type CompletionStream =
  Stream<together.Together.Chat.ChatCompletionChunk>;

export type Message = {
  role: 'user' | 'system' | 'assistant';
  content: string;
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
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    max_tokens: 512,
    temperature: 0.7,
    top_p: 0.7,
    top_k: 50,
    repetition_penalty: 1,
    stop: ['<|eot_id|>', '<|eom_id|>'],
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
