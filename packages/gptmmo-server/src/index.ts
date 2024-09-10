import * as completion from '@/completion';
import * as serverRuntime from '@gptmmo/server-runtime';

const main = async () => {
  const runtime = serverRuntime.getRuntime('local');
  console.log(runtime);

  const stream = await completion.completePrompt({
    prompt: 'what is your name?',
  });

  for await (const chunk of stream) {
    console.log(chunk.choices[0].delta.content);
  }
};

main();
