import * as webStream from 'web-streams-polyfill';

/**
 * Merges an array of readable streams into a single readable stream by reading
 * them in series.
 *
 * @param streams - An array of readable streams.
 *
 * @returns A single stream from all the inputted streams.
 */
export const concatenate = <T>(
  streams: Iterable<webStream.ReadableStream<T>>,
): webStream.ReadableStream<T> => {
  const unreadStreams = Array.from(streams);

  let currentReader: webStream.ReadableStreamDefaultReader<T> | null = null;
  return new webStream.ReadableStream({
    async pull(controller) {
      if (currentReader == null) {
        const nextStream = unreadStreams.shift();
        if (nextStream == null) {
          controller.close();
          return;
        }

        currentReader = nextStream.getReader();
      }

      const result = await currentReader.read();
      if (result.done) {
        currentReader = null;
        return;
      }

      controller.enqueue(result.value);
    },
  });
};
