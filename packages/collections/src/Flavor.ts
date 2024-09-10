/*
 * Flavoring is a method of adding nominal typing to TypeScript. The _type
 * property is optional, so when you try to use one Flavor instead of another,
 * you get a type error as the _type properties are different. But if you
 * create a Flavor with basic type string, and you want to set a primitive
 * string value to it, Flavor allows you to do that since the primitive has no
 * _type property.
 *
 * For example:
 * type PersonId = Flavor<number, “Person”>
 * type BlogPostId = Flavor<number, “BlogPost”>
 * const personId : PersonId = 1; // OK
 * const person: Person = personLikeStructure // OK
 * const blogPostId : BlogPostId = personId; // Error!
 *
 * See here for more info: https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
 */

type Flavoring<FlavorT> = {
  _type: FlavorT;
};

export type Flavor<T, FlavorT> = T & Partial<Flavoring<FlavorT>>;

/**
 * Unlike a flavor which supports implicit casting from type `T` to a flavor of
 * type `T`, brands require explicit casting via `stampBrand`. This is useful
 * when you want to prevent accidentally converting primitives into Brands.
 */
export type Brand<T, FlavorT> = T & Flavoring<FlavorT>;

/**
 * Converts an object of type `T` to a Brand of type `T`.
 *
 * Note that this method can rebrand objects, as seen in the following example:
 *
 * ```ts
 * type Foo = tsExtensions.Brand<number, "foo">;
 * type Bar = tsExtensions.Brand<number, "bar">;
 *
 * const foo: Foo = stampBrand(100);
 *
 * // This compiles.
 * const bar: Bar = stampBrand(foo);
 *
 * // This does not.
 * const bar: Bar = foo;
 * ```
 * @param value The value to stamp as a brand.
 *
 * @returns The branded value.
 */
export const stampBrand = <T, FlavorT>(value: T): Brand<T, FlavorT> =>
  value as unknown as Brand<T, FlavorT>;
