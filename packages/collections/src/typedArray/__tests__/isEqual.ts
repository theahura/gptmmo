import * as typedArray from '@/typedArray';

describe('isEqual', () => {
  describe('Uint8Array', () => {
    it('is true for two empty arrays.', () => {
      expect(typedArray.isEqual(new Uint8Array(0), new Uint8Array(0))).toBe(
        true,
      );
    });

    it('is false for arrays with different sizes.', () => {
      expect(typedArray.isEqual(new Uint8Array(4), new Uint8Array(8))).toBe(
        false,
      );
    });

    it('is true for arrays with the same bit-wise contents.', () => {
      expect(
        typedArray.isEqual(
          Uint8Array.of(1, 2, 3, 4),
          Uint8Array.of(1, 2, 3, 4),
        ),
      ).toBe(true);
    });

    it('is false for arrays with the same contents in different orders.', () => {
      expect(
        typedArray.isEqual(
          Uint8Array.of(1, 2, 3, 4),
          Uint8Array.of(1, 2, 4, 3),
        ),
      ).toBe(false);
    });
  });

  describe('Float32Array', () => {
    it('is true for two empty arrays.', () => {
      expect(
        typedArray.isEqual(new Float32Array(0), new Float32Array(0)),
      ).toBe(true);
    });

    it('is false for arrays with different sizes.', () => {
      expect(
        typedArray.isEqual(new Float32Array(4), new Float32Array(8)),
      ).toBe(false);
    });

    it('is true for arrays with the same bit-wise contents.', () => {
      expect(
        typedArray.isEqual(
          Float32Array.of(-100.5, -50.5, 0, 50.5, 100.5),
          Float32Array.of(-100.5, -50.5, 0, 50.5, 100.5),
        ),
      ).toBe(true);
    });

    it('is false for arrays with the same contents in different orders.', () => {
      expect(
        typedArray.isEqual(
          Float32Array.of(-100.5, -50.5, 0, 50.5, 100.5),
          Float32Array.of(-100.5, -50.5, 0, 100.5, 50.5),
        ),
      ).toBe(false);
    });
  });
});
