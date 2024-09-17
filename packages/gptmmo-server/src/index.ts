import * as serverRuntime from '@gptmmo/server-runtime';
import * as status from '@gptmmo/status';
import * as session from '@/session';
import * as context from '@/context';

const main = async () => {
  const maybeRuntime = await serverRuntime.getRuntime('local');
  if (!status.isOk(maybeRuntime)) {
    console.error('Fatal: could not get runtime.');
    return;
  }
  const runtime = maybeRuntime.value;

  const maybeServerContext = await context.createServerContext({ runtime });
  if (!status.isOk(maybeServerContext)) {
    console.error('Fatal: could not get context.');
    return;
  }
  const serverContext = maybeServerContext.value;

  const maybeSession = await session.runSession({ serverContext });
  if (!status.isOk(maybeSession)) {
    console.error('Fatal: could not run session.');
    console.error(maybeSession.error);
    throw new Error('Failed to run session');
  }
};

main();
