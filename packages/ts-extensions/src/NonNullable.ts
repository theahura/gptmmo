/**
 * An extension of NonNullable that applies it shallowly to all fields of an
 * object.
 *
 * For example, NonNullable<{a: string | null, b: number | undefined}> would
 * return {a: string, b: number }.
 *
 * For a deep NonNullable type, simply use tsEssentials.DeepNonNullable.
 * Note that this operates slightly differently from Required<T> -- the latter
 * does not handle `null`, i.e. it is possible to have a value with a key
 * present that is set to `null`. See:
 * typescriptlang.org/play?#code/C4TwDgpgBAYg9nKBeKBvAUFLUCGB+ALigGdgAnASwDsBzKAHyioFcAbVgbk2wCNCTy1OoxbsuAX3TpQkKACEcZZFABKEAI7MKZCABMAPPDgA+dAHoz2AHp4pM6ADk4VB21Y4erCDAoRWu4n0AFWNlDCwAbQBpKGooAGsIEDgAMygggF0AWn4nFzcPL2DojOMJLmlwaAUAL2U813ZC719-QKNTC2s8IA
 */
export type RequiredAndNonNull<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

/**
 * An extension of NonNullable that applies it partially to specific fields of
 * an object.
 *
 * For example, RequireSpecific<{a: string | null, b: number | undefined}, 'a'>
 * would return {a: string, b: number | undefined }.
 */
export type RequireSpecific<T, K extends keyof T> = {
  [P in keyof T]: T[P];
} & { [P in K]-?: NonNullable<T[P]> };
