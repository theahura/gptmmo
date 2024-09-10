import * as iteration from '@/linkedList/iteration';

type ExampleLinkedList = {
  value: number;
  then?: ExampleLinkedList;
};

describe('toArray', () => {
  it('contains all nodes', () => {
    const linkedList: ExampleLinkedList = {
      value: 100,
      then: {
        value: 200,
        then: {
          value: 300,
        },
      },
    };

    expect(
      iteration
        .toArray(linkedList, (node) => node.then ?? null)
        .map((node) => node.value),
    ).toStrictEqual([100, 200, 300]);
  });
});

describe('iterate', () => {
  it('Can modify relationships during iteration.', () => {
    const nodeA: ExampleLinkedList = { value: 100 };
    const nodeB: ExampleLinkedList = { value: 200 };
    const nodeC: ExampleLinkedList = { value: 300 };

    nodeA.then = nodeB;
    nodeB.then = nodeC;

    expect(nodeA).toStrictEqual({
      value: 100,
      then: {
        value: 200,
        then: {
          value: 300,
        },
      },
    });

    for (const node of iteration.iterate(nodeA, (node) => node.then ?? null)) {
      delete node['then'];
    }

    expect(nodeA).toStrictEqual({ value: 100 });
    expect(nodeB).toStrictEqual({ value: 200 });
    expect(nodeC).toStrictEqual({ value: 300 });
  });
});
