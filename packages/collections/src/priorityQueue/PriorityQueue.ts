import * as status from '@gptmmo/status';
import { FibonacciHeap } from '@tyriar/fibonacci-heap';

import * as promises from '@/promises';

import type * as fibonacciHeap from '@tyriar/fibonacci-heap';

/**
 * A Priority Queue ferries messages unidirectionally from a publisher to a
 * consumer with a customizable priority so that the consumer can consume
 * messages with the highest importance first.
 */
export type PriorityQueue<T> = {
  publisher: Publisher<T>;
  consumer: Consumer<T>;
};

export type Publisher<T> = {
  /**
   * Publishes a new message on a PriorityQueue.
   *
   * @param value - The message to publish.
   * @param priority - The priority with which to enqueue it.
   *
   * @returns A success if the message was published, failure if not. For
   *   example, publish will return false if the PriorityQueue is closed. A
   *   success will include callbacks that can be used to reprioritize or remove
   *   the message from the queue.
   */
  insert: (value: T, priority: number) => status.StatusOr<EnqueuedMessage<T>>;

  /**
   * Closes the PriorityQueue. This means that no more messages may be
   * published, but existing messages will be delivered to the consumer.
   */
  close: () => void;
};

export type Consumer<T> = {
  /**
   * Waits for the consumer's message queue to be non-empty (will return
   * immediately if the queue is already non-empty).
   *
   * @returns A promise which will resolve with true when the consumer has data
   *   to drain or false if the priority queue has been closed and all data has
   *   been drained.
   */
  waitForData(): Promise<boolean>;

  /**
   * Indicates if the consumer's message queue is non-empty.
   *
   * @returns True if messages are currently queued, false otherwise.
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
   * Sychronously drains data received by the consumer from high to low
   * priority. Once drained, messages will not be retained.
   *
   * This method is often most useful in conjunction with `waitForData` so that
   * you can both drain received data and wait for new data.
   *
   * @returns An iterator which can be used to drain data currently queued by
   *   the consumer.
   */
  drain(): IterableIterator<T>;

  /**
   * Note that despite the publisher being closed, the consumer may still have
   * queued messages to drain.
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

  /**
   * If there are enqueued messages, returns and dequeues the next single
   * highest priority enqueued message.
   *
   * @returns The next message if there is one - null if not.
   */
  pop: () => T | null;
};

/**
 * Represents a message that has been entered onto the queue. Includes the
 * actual value and some callbacks that can manipulate the message's place in
 * the queue.
 */
export type EnqueuedMessage<T> = {
  value: T;

  /**
   * Updates the priority of this message. Takes a new priority number and
   * returns a status indicating success or failure.
   *
   * @param newPriority The new priority to set the message to.
   *
   * @returns A boolean indicating whether the priority was updated, or whether
   *   the update failed.
   */
  updatePriority: (newPriority: number) => boolean;

  /**
   * Removes this message from the queue.
   *
   * @returns A boolean indicating whether the message was removed, or whether
   *   the message was not present in the queue.
   */
  remove: () => boolean;
};

/**
 * The Fibonacci heap implementation that we use uses as the value for a key `T
 * | null`. This means that we need to handle the value null case even if `null`
 * is not an acceptable value for `T`. The obvious way to do this is to skip
 * null values, but what if `null` IS an acceptable value for `T`? Then we've
 * skipped a value that we want to preserve.
 *
 * In order to be able to differentiate between these two cases, we store this
 * type rather than a raw `T`. That way a null value from the Fibonacci heap can
 * be safely skipped without sacrificing the ability to intentionally set null
 * values.
 */
type Entry<T> = {
  value: T;
};

/**
 * Creates a new Priority Queue.
 *
 * @returns A new `PriorityQueue`.
 */
export const createPriorityQueue = <T>(): PriorityQueue<T> => {
  // Note that the comparator is backwards to what you might expect - this is
  // because we want a max-heap rather than a min-heap.
  const heap = new FibonacciHeap<number, Entry<T>>((a, b) => b.key - a.key);
  // The heap doesn't have an easy way of tracking which nodes still remain in
  // the heap and which have been removed, so we keep track of this information
  // with this Set. This is important so that we can communicate when a caller
  // is attempting to reprioritize or remove a message that has already been
  // drained from the queue.
  const insertedNodes = new WeakSet<fibonacciHeap.INode<number, Entry<T>>>();
  let closed = false;

  let waitForDataPromise: promises.Deferred<boolean> | null = null;

  const insert: Publisher<T>['insert'] = (value, priority) => {
    if (closed) {
      return status.fromError('PriorityQueue is closed.');
    }

    let node = heap.insert(priority, { value });
    insertedNodes.add(node);

    if (waitForDataPromise != null) {
      waitForDataPromise.resolve(true);
      waitForDataPromise = null;
    }

    return status.fromValue({
      value,

      updatePriority: (newPriority) => {
        if (!insertedNodes.has(node)) {
          return false;
        }

        // If the priority is unchanged, no need to do anything.
        if (newPriority === node.key) {
          return true;
        }

        // If the priority is increasing (in our max-heap implementation, i.e.
        // decreasing in the traditional min-heap), this is a built-in O(1)
        // operation called `decreaseKey` that we can call directly.
        if (newPriority > node.key) {
          try {
            heap.decreaseKey(node, newPriority);
          } catch (error) {
            console.warn(`Failed to decrease key ${node}`, error);
            return false;
          }

          return true;
        }

        // If the priority is decreasing (i.e. increasing in a min-heap) we need
        // to remove the old node and insert a new one, which is O(log n).
        try {
          heap.delete(node);
          insertedNodes.delete(node);
        } catch (error) {
          console.warn(`Failed to remove node ${node}`, error);
          return false;
        }

        node = heap.insert(newPriority, { value });
        insertedNodes.add(node);

        return true;
      },

      remove: () => {
        if (!insertedNodes.has(node)) {
          return false;
        }

        heap.delete(node);
        insertedNodes.delete(node);

        return true;
      },
    });
  };

  const close: Publisher<T>['close'] = () => {
    closed = true;
    if (waitForDataPromise != null) {
      waitForDataPromise.resolve(hasData());
      waitForDataPromise = null;
    }
  };

  const waitForData: Consumer<T>['waitForData'] = () => {
    if (closed || !heap.isEmpty()) {
      return Promise.resolve(hasData());
    } else if (waitForDataPromise != null) {
      return waitForDataPromise.promise;
    } else {
      waitForDataPromise = promises.createDeferred<boolean>();
      return waitForDataPromise.promise;
    }
  };

  const drain: Consumer<T>['drain'] = function* () {
    while (!heap.isEmpty()) {
      const next = heap.extractMinimum();
      if (next == null) {
        continue;
      }
      insertedNodes.delete(next);

      if (next.value != null) {
        yield next.value.value;
      }
    }
  };

  const hasData: Consumer<T>['hasData'] = () => !heap.isEmpty();

  const depth = (): Consumer<T>['depth'] => heap.size();

  const isClosed: Consumer<T>['isClosed'] = () => closed;

  const toAsyncIterator: Consumer<T>['toAsyncIterator'] = async function* () {
    while (await waitForData()) {
      for (const value of drain()) {
        yield value;
      }
    }
  };

  const pop: Consumer<T>['pop'] = () => {
    const iterator = drain();

    const next = iterator.next();
    if (next.done) {
      return null;
    }
    const nextRequest = next.value;

    return nextRequest;
  };

  return {
    publisher: {
      insert,
      close,
    },
    consumer: {
      waitForData,
      hasData,
      get depth() {
        return depth();
      },
      drain,
      isClosed,
      toAsyncIterator,
      pop,
    },
  };
};
