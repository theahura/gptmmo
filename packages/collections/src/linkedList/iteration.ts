/**
 * Generates an iterator over a linked list.
 *
 * Note that the next node in the sequence is determined before yielding a node.
 * This allows callers to mutate nodes during iteration without impacting
 * iteration order.
 *
 * @param initialNode - The starting point for iteration.
 * @param next - A function to determine the next node in the sequence.
 *
 * @yields Nodes starting from the initial node.
 */
export const iterate = function* <T>(
  initialNode: T,
  next: (node: T) => T | null,
): Generator<T> {
  let node: T | null = initialNode;
  while (node != null) {
    const nextNode = next(node);
    yield node;
    node = nextNode;
  }
};

/**
 * Converts a linked list to an array.
 *
 * @param initialNode - The starting point for iteration.
 * @param next - A function to determine the next node in the sequence.
 *
 * @returns An Array of linked list nodes.
 */
export const toArray = <T>(
  initialNode: T,
  next: (node: T) => T | null,
): Array<T> => Array.from(iterate(initialNode, next));
