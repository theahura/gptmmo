import * as promises from '@/promises';

/**
 * A Message Queue ferries messages unidirectionally from a publisher to a
 * consumer so the the consumer and publisher may operate at different rates
 * while retaining messages and their order.
 *
 * This is typically used for Inter Process Communication (IPC) or Inter Thread
 * Communication (ITC).
 */
export type MessageQueue<T> = {
  publisher: Publisher<T>;
  consumer: Consumer<T>;
};

export type Publisher<T> = {
  /**
   * Publishes a new message on a MessageQueue.
   *
   * @param value - The message to publish.
   *
   * @returns True if the message was published, false if not. For example,
   *   publish will return false if the MessageQueue is closed.
   */
  push: (value: T) => boolean;

  /**
   * Closes the MessageQueue. This means that no more messages may be published,
   * but existing messages will be delivered to the consumer.
   */
  close: () => void;
};

export type Consumer<T> = {
  /**
   * Waits for the consumer's message buffer to be non-empty (will return
   * immediately if the buffer is already non-empty).
   *
   * @returns A promise which will resolve with true when the consumer has data
   *   to drain or false if the message queue has been closed and all data has
   *   been drained.
   */
  waitForData(): Promise<boolean>;

  /**
   * Indicates if the consumer's message buffer is non-empty.
   *
   * @returns True if messages are currently buffered, false otherwise.
   */
  hasData(): boolean;

  /**
   * Exposes the size of the internal message buffer without draining messages.
   * Primarily useful for auditing queue back pressure.
   *
   * @returns The current number of messages in the message buffer.
   */
  get depth(): number;

  /**
   * Sychronously drains data received by the consumer. Once drained, messages
   * will not be retained.
   *
   * This method is often most useful in conjunction with `waitForData` so that
   * you can both drain received data and wait for new data.
   *
   * @returns An iterator which can be used to drain data currently buffered by
   *   the consumer.
   */
  readBuffer(): IterableIterator<T>;

  /**
   * Note that despite the publisher being closed, the consumer may still have
   * buffered messages to drain.
   *
   * @returns If the publisher has been closed.
   */
  isClosed(): boolean;

  /**
   * @returns An async iterator which will iterate over all data received by
   *   this consumer until the publisher is closed and all data has been
   *   drained.
   */
  toAsyncIterator(): AsyncIterableIterator<T>;
};

/**
 * Creates a new Message Queue.
 *
 * @returns A new `MessageQueue`.
 */
export const createMessageQueue = <T>(): MessageQueue<T> => {
  const buffer: Array<T> = [];
  let closed = false;

  let waitForDataPromise: promises.Deferred<boolean> | null;

  const push: Publisher<T>['push'] = (value) => {
    if (closed) {
      return false;
    }

    buffer.push(value);
    if (waitForDataPromise != null) {
      waitForDataPromise.resolve(true);
      waitForDataPromise = null;
    }
    return true;
  };

  const close: Publisher<T>['close'] = () => {
    closed = true;
    if (waitForDataPromise != null) {
      waitForDataPromise.resolve(hasData());
      waitForDataPromise = null;
    }
  };

  const waitForData: Consumer<T>['waitForData'] = () => {
    if (closed || buffer.length > 0) {
      return Promise.resolve(hasData());
    } else if (waitForDataPromise != null) {
      return waitForDataPromise.promise;
    } else {
      waitForDataPromise = promises.createDeferred<boolean>();
      return waitForDataPromise.promise;
    }
  };

  const readBuffer: Consumer<T>['readBuffer'] = function* () {
    while (buffer.length > 0) {
      // TypeScript does not narrow arrays when evaluating against length, so
      // it thinks the return type of `shift` could be undefined here when we
      // know it can't be.
      //
      // See https://github.com/microsoft/TypeScript/issues/30406
      yield buffer.shift() as T;
    }
  };

  const hasData: Consumer<T>['hasData'] = () => buffer.length > 0;

  const depth = (): Consumer<T>['depth'] => buffer.length;

  const isClosed: Consumer<T>['isClosed'] = () => closed;

  const toAsyncIterator: Consumer<T>['toAsyncIterator'] = async function* () {
    while (await waitForData()) {
      for (const value of readBuffer()) {
        yield value;
      }
    }
  };

  return {
    publisher: {
      push,
      close,
    },
    consumer: {
      waitForData,
      hasData,
      get depth() {
        return depth();
      },
      readBuffer,
      isClosed,
      toAsyncIterator,
    },
  };
};
