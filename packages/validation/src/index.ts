/**
 * Library for validating that json blobs match a specified jsonschema.
 *
 * In any networked application, it is critical to know whether the data we are
 * receiving from our application edge is 'clean' -- that is, follows the
 * standards that are laid out by the externally-facing application contract.
 * Unclean data can lead to downstream bugs and results in a codebase that is
 * littered with disorganized attempts at one-off validation.
 *
 * In theory, Typescript interfaces could be used to validate data -- they
 * contain all of the relevant information about what the types should be.
 * However, they don't exist at runtime. The data that needs to be validated
 * only exists at runtime, so we need to find a way to port the interface to
 * runtime, in a way that ideally retains the type checking.
 *
 * This library uses ajv to expose a simple api for validating untyped json
 * data, while indicating the expected type to the Typescript compiler.
 *
 * A simple example:
 * ```
 * import * as schema from '@/lib/schema';
 *
 * interface Foo {
 *   name: 'FOO';
 *   message: string;
 * }
 *
 * const FooSchema = {
 *   type: 'object',
 *   properties: {
 *     name: {
 *       type: 'string',
 *       const: 'FOO'
 *     },
 *     message: {
 *       type: 'string'
 *     },
 *   },
 *   required: [],
 *   additionalProperties: false
 * }
 *
 * // FooSchema and Foo must exactly match, or TS will throw a compilation err.
 * const compiler = schema.createCompiler(); // Generally created globally.
 * const schema = schema.requires(FooSchema, ['name', 'message'])
 * const validator = schema.compile<Foo>(compiler, schema)
 *
 * const fooDoc = {
 *   name: 'FOO';
 *   message: 'hello'
 * }
 *
 * const barDoc = {
 *   name: 'BAR';
 * }
 *
 * // At run time.
 * schema.validate(validator, fooDoc);  // StatusOr<Foo>
 * schema.validate(validator, barDoc);  // StatusOr<ERR_SCHEMA_VALIDATION>
 * ```
 *
 * Two brief notes on schema construction:
 *
 * 1) there are a decent number of stylistic principles that are worth
 * following to avoid unnecessary complexity and random typescript errors. It
 * is worth briefly skimming the schema section at go/style before constructing
 * custom schemas.
 *
 * 2) To mimic intersection types, use a top level allOf; to mimic union types,
 * use a top level oneOf (note that you need to ensure the oneOf schemas are
 * actually unique, likely with required fields). These should act as universal
 * constructors for other types.
 */

export * from '@/commonValidators';
export * from '@/json';
export * from '@/schema';
