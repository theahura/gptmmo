export function copy(typedArray: Uint8Array): Uint8Array;
export function copy(typedArray: Uint8ClampedArray): Uint8ClampedArray;
export function copy(typedArray: Uint16Array): Uint16Array;
export function copy(typedArray: Uint32Array): Uint32Array;
export function copy(typedArray: BigUint64Array): BigUint64Array;
export function copy(typedArray: Int8Array): Int8Array;
export function copy(typedArray: Int16Array): Int16Array;
export function copy(typedArray: Int32Array): Int32Array;
export function copy(typedArray: BigInt64Array): BigInt64Array;
export function copy(typedArray: Float32Array): Float32Array;
export function copy(typedArray: Float64Array): Float64Array;

/**
 * Typed arrays are *views* into an underlaying `ArrayBuffer`. This is improves
 * performance by ensuring the common operations such as subarray don't require
 * copying memory, and instead act as pointers to a shared buffer. However,
 * there are cases where it's desired to make a copy of a typed array. This
 * method accepts any typed array and returns a new typed array of the same type
 * with a new internal buffer.
 *
 * @param typedArray - The array to copy. Note that only the contents of the
 *   view are copied, not the entire internal buffer.
 *
 * @returns A mem-copy of the provided typed array.
 */
// eslint-disable-next-line func-style
export function copy(
  typedArray:
    | Uint8Array
    | Uint8ClampedArray
    | Uint16Array
    | Uint32Array
    | BigUint64Array
    | Int8Array
    | Int16Array
    | Int32Array
    | BigInt64Array
    | Float32Array
    | Float64Array,
):
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | BigUint64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | BigInt64Array
  | Float32Array
  | Float64Array {
  // By default, `Object.prototype.constructor` is of type `Function` which is
  // not constructable. In this case, we know that `typedArray` must be a typed
  // array so we inform typescript that the constructor must be a typed array
  // constructor.
  const constructor = typedArray.constructor as TypedArrayConstructor;

  return new constructor(typedArray);
}

type TypedArrayConstructor =
  | typeof Uint8Array
  | typeof Uint8ClampedArray
  | typeof Uint16Array
  | typeof Uint32Array
  | typeof BigUint64Array
  | typeof Int8Array
  | typeof Int16Array
  | typeof Int32Array
  | typeof BigInt64Array
  | typeof Float32Array
  | typeof Float64Array;
