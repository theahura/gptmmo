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

export type Session = Array<Message>;

export const completePrompt = async (args: {
  prompt: string;
  systemContext?: string;
  previousMessages?: Array<Message>;
}): Promise<CompletionStream> => {
  const { prompt, previousMessages, systemContext } = args;

  const messages: Array<together.Together.Chat.Completions.CompletionCreateParams.Message> =
    [];

  if (systemContext != null) {
    messages.push({ role: 'system', content: systemContext });
  }

  if (previousMessages != null) {
    messages.concat(previousMessages);
  }

  messages.push({ role: 'user', content: prompt });

  return client.chat.completions.create({
    messages,
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    stop: ['<|eot_id|>', '<|eom_id|>'],
    stream: true,
  });
};
