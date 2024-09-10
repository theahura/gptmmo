import * as typedArray from '@/typedArray';

describe('copy', () => {
  it('copies when the buffer and view have the same size.', () => {
    const original = Uint8Array.from([1, 2, 3, 4, 5]);
    const copy = typedArray.copy(original);

    expect(original).toStrictEqual(copy);
    expect(original.buffer).toStrictEqual(copy.buffer);
    expect(original.buffer).not.toBe(copy.buffer);
  });

  it('copies when the buffer and view have different sizes.', () => {
    const original = Uint8Array.from([1, 2, 3, 4, 5]).subarray(1, 4);
    const copy = typedArray.copy(original);

    expect(original).toStrictEqual(copy);
    expect(original.buffer).not.toStrictEqual(copy.buffer);
    expect(original.buffer).not.toBe(copy.buffer);

    expect(original.buffer.byteLength).toBe(5);
    expect(copy.buffer.byteLength).toBe(3);
  });
});
