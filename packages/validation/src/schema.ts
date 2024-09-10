import assert from 'assert';

import * as status from '@gptmmo/status';
import * as ajv from 'ajv';
import _ from 'lodash';

import type * as tsExtensions from '@gptmmo/ts-extensions';
import type * as ajvTypes from 'ajv/dist/types';
import type * as ajvJSONTypes from 'ajv/dist/types/json-schema.d';

export type Compiler = ajv.default;
export type Schema<T> = ajv.JSONSchemaType<T>;
export type Validator<T> = ajvTypes.ValidateFunction<T>;

export const createCompiler = (options?: ajv.Options): Compiler => {
  return new ajv.default(options);
};

/**
 * SomeSchema is an untyped version of JSONSchemaType. It comes with NO
 * typescript guarantees. There are places where this is required because AJV
 * is buggy or insufficient, but in general we should always prefer Schema<T>
 * over SomeSchema. If you must use SomeSchema, clearly document why its usage
 * is necessary; if this is due to a bug in ajv, file a bug with the
 * maintainers and link it in the description.
 */
export type SomeSchema = ajvJSONTypes.SomeJSONSchema;

/**
 * Given a JSONSchema, updates the `required` field.
 *
 * According to our go/style, we generally do not want to bake 'required'
 * fields into our data structures. Requirements change, and adding or removing
 * required data breaks backwards and forwards compatibility in a pretty
 * definitive way. To avoid this, we instead want to add/remove requirements
 * on the fly for a given input schema.
 *
 * This function allows you to add requirements. Here's an example where we
 * want to have different requirements for POST and PATCH on the same schema
 * object.
 * ```
 * schema = {
 *   type: 'object',
 *   properties: {
 *     fieldA: {
 *       type: 'string'
 *     }
 *     fieldA: {
 *       type: 'string'
 *     }
 *   }
 * }
 * postSchema = requires(schema, ['fieldA', 'fieldB'])
 * patchSchema = requires(schema, ['fieldB'])
 * ```
 *
 * @param inputSchema a complete JSONSchema, possibly with preexisting
 *   requirements.
 * @param required a list of required fields in type T. Alternatively, you can
 *   pass '*', which is equivalent to passing in a list with ALL of the fields.
 *   Any validator created with the returned schema will fail if the `required`
 *   fields are not present.
 * @param invert marks all fields as required, and then treats the passed in
 *   `required` param as fields that are NOT required.
 * @param override if there are already fields in the JSONSchema that are
 *   marked as required, by default we simply add onto those. If `override` is
 *   `true`, however, we replace the previous fields.
 *
 * @returns Schema the same schema as the input, but with updated requirements.
 */
export const requires = <T>(
  inputSchema: Schema<T>,
  required: Array<keyof T & string> | '*',
  invert = false,
  override = false,
): Schema<T> => {
  const schema = _.cloneDeep(inputSchema);

  if (invert) {
    const properties = new Set(Object.keys(schema.properties)) as Set<
      keyof T & string
    >;
    for (const field of required) {
      properties.delete(field as keyof T & string);
    }
    required = [...properties];
  }

  let requiredProperties =
    required === '*' ? Object.keys(schema.properties) : required;

  if (!override) {
    requiredProperties = [...schema.required, ...requiredProperties];
  }

  schema.required = [...new Set(requiredProperties)];
  return schema;
};

/**
 * Given a JSONSchema, updates the `not.required` field. See requires() for a
 * more full explanation.
 *
 * @param inputSchema a complete JSONSchema, possibly with preexisting
 *   requirements.
 * @param requiredAbsent a list of fields in type T that should NOT be present.
 *   any validator created with the returned schema will fail if the
 *   `requiredAbsent` fields ARE present.
 * @param invert marks all fields as not required, and then treats the passed
 *   in `requiredAbsent` param as fields that may or may not be present.
 * @param override if there are already fields in the JSONSchema that are
 *   marked as not required, by default we simply add onto those. If `override`
 *   is `true`, however, we replace the previous fields.
 *
 * @returns Schema the same schema as the input, but with updated requirements.
 */
export const requiresAbsence = <T>(
  inputSchema: Schema<T>,
  requiredAbsent: Array<keyof T & string>,
  invert = false,
  override = false,
): Schema<T> => {
  const schema = _.cloneDeep(inputSchema);

  if (invert) {
    const properties = new Set(Object.keys(schema.properties)) as Set<
      keyof T & string
    >;
    for (const field of requiredAbsent) {
      properties.delete(field as keyof T & string);
    }
    requiredAbsent = [...properties];
  }

  if ('not' in schema) {
    if ('required' in schema.not && !override) {
      schema.not.required.concat(...requiredAbsent);
    } else {
      schema.not.required = requiredAbsent;
    }
  } else {
    schema.not = { required: requiredAbsent };
  }

  schema.not.required = [...new Set(schema.not.required)];
  return schema;
};

/**
 * Given a JSONSchema with preexisting definitions, replace those definitions.
 *
 * Because we do not have `required` fields set on our JSONSchemas (see
 * go/style as well as the explanation in `requires()` above), schemas that
 * have nested schemas may need to have those nested schemas'' requirements
 * updated. This function acts as a utility to make that easier
 *
 * Simple example:
 * ```
 * nestedSchema = { some json schema }
 * schema = {
 *   type: 'object',
 *   properties: {
 *     foo: {
 *       $ref: Foo
 *     }
 *   },
 *   definitions: {
 *     Foo: nestedSchema
 *   }
 * }
 * nestedSchemaWithRequires = requires(nestedSchema, ['fieldA', 'fieldB'])
 * updatedNestedDefinitions = replaceDefinitions(schema, {
 *   'Foo': nestedSchemaWithRequires
 * })
 *
 * // updatedNestedDefinitions now requires foo.fieldA and foo.fieldB
 * ```
 *
 * @param inputSchema a complete JSONSchema, possibly with preexisting
 *   definitions.
 * @param definitions The new definitions as replacements.
 *
 * @returns Schema the same schema as the input, but with updated requirements.
 */
export const replaceDefinitions = <T>(
  inputSchema: Schema<T>,
  definitions: { [key: string]: any },
): Schema<T> => {
  const schema = _.cloneDeep(inputSchema);
  for (const [k, v] of Object.entries(definitions)) {
    assert(
      schema.definitions && k in schema.definitions,
      'Trying to update nonexistent definition {k}',
    );
    schema.definitions[k] = v;
  }
  return schema;
};

/**
 * Given a schema, constructs a validator -- a single-parameter function that
 * returns true iff the passed in data matches the JSONSchema.
 *
 * AJV Schema compilation can be a bit tricky because of how dependencies load.
 * AJV attempts to find all $refs at time of compilation. This means that if
 * schema A references schema B, and schema B has not been previously compiled,
 * schema A will fail. To avoid this issue (and to make our dependencies clear)
 * we explicitly declare dependencies in the definitions field (see go/style).
 * This can potentially result in a second issue: schema $ids are supposed to
 * be globally unique. If schema A is composed of schemas B and C, and schemas
 * B and C are both composed of schema D, there will appear to be duplicate
 * $ids for schema D (even though they are exactly the same schema). To resolve
 * this issue, the compilation code will traverse the schema tree and remove
 * duplicate dependencies. See the tests for an example.
 *
 * @param compiler The compiler used to create a validator.
 * @param inputSchema the schema to compile.
 *
 * @returns Validator that returns true if the passed data matches inputSchema.
 */
export const compile = 
  <T>(compiler: Compiler, inputSchema: Schema<T>): Validator<T> => {
    const schema = _.cloneDeep(inputSchema);

    const dependencies: { [key: string]: SomeSchema } = {};

    const dependencyAlreadyLoaded = (schema: SomeSchema) => {
      const id = schema['$id'];

      // We only care about dup $id fields, which need to be globally unique. If
      // there isnt any $id field, treat the schema as unique.
      if (id == null) {
        return false;
      }

      if (id in dependencies) {
        // If we already saw this dependency, we can check if the dependency is
        // exactly equivalent (the same reference pointer) as the previous one
        // being loaded. If they are NOT the same, we may be trying to load
        // different schemas with the same $id, in which case we should throw.
        // Otherwise, the dependency is already loaded.
        assert(
          dependencies[id] === schema,
          `Got two definitions of the same dependency for id: ${id}. If this is
         intentional, make sure to pass the same object refs for both deps. If
         it is intentional and you want to use different object refs for the
         same $id, do not do that, $id is supposed to be globally unique.`,
        );
        return true;
      }

      // Add the previously unseen dep to our cache and return indicating this
      // was a unique dependency (so far).
      dependencies[id] = schema;
      return false;
    };

    const recursiveCheck = (node: SomeSchema) => {
      if (node['definitions'] != null) {
        const definitions = node['definitions'];
        for (const [k, child] of Object.entries(definitions)) {
          if (dependencyAlreadyLoaded(child)) {
            delete definitions[k];
          } else {
            recursiveCheck(child);
          }
        }
      }
    };

    recursiveCheck(schema as SomeSchema);
    return compiler.compile(schema);
  }

/**
 * Enables typesafe caching of validators using a composite key formed from the
 * compiler and schema references which created the validator.
 *
 * Note that the schema and compiler references are weakly held. If either are
 * garbage collected, the resulting validator will be removed from the cache.
 */
class ValidatorCache {
  #validators: WeakMap<Compiler, WeakMap<any, Validator<any>>>;

  constructor() {
    this.#validators = new WeakMap();
  }

  set<T>(compiler: Compiler, schema: Schema<T>, validator: Validator<T>) {
    const existingValidators = this.#validators.get(compiler);
    if (existingValidators != null) {
      existingValidators.set(schema, validator);
      return;
    }

    const compilerValidators = new WeakMap<any, Validator<any>>();
    compilerValidators.set(schema, validator);
    this.#validators.set(compiler, compilerValidators);
    return;
  }

  get<T>(compiler: Compiler, schema: Schema<T>): Validator<T> | undefined {
    const existingValidators = this.#validators.get(compiler);
    if (existingValidators == null) {
      return undefined;
    }

    return existingValidators.get(schema);
  }
}

const VALIDATOR_CACHE = new ValidatorCache();

/**
 * Compiles the given schema with the given compiler, however, unlike `compile`
 * this method will cache the result and if `getOrCompile` is called again with
 * the same compiler and schema references, it will return the cached result.
 *
 * @param compiler The compiler to use.
 * @param inputSchema The schema to compile.
 *
 * @returns A validator for use with `validate`.
 */
export const getOrCompile = <T>(
  compiler: Compiler,
  inputSchema: Schema<T>,
): Validator<T> => {
  const cachedValidator = VALIDATOR_CACHE.get(compiler, inputSchema);
  if (cachedValidator != null) {
    return cachedValidator;
  }

  const validator = compile(compiler, inputSchema);
  VALIDATOR_CACHE.set(compiler, inputSchema, validator);
  return validator;
};

/**
 * Given a validator and a document, validates the document and returns the
 * result as a StatusOr.
 *
 * @param validator The schema validator.
 * @param doc The document to validate.
 *
 * @returns The validated document.
 */
export const validate = 
  <T>(validator: Validator<T>, doc: any): status.StatusOr<T> => {
    if (validator(doc)) {
      return status.fromValue(doc);
    }

    return status.fromError(
      `Validation failed with errors: ${validator.errors?.map(
        (error) => `${error.schemaPath}: ${error.message}\n`,
      )}`,
    );
  }

/**
 * Given a validator and an array of documents, checks if each document
 * matches. If there's a failure, returns the error message of the first doc
 * that fails.
 *
 * @param validator The schema validator.
 * @param docs The documents to validate.
 *
 * @returns The validated documents.
 */
export const validateMany = <T>(
  validator: Validator<T>,
  docs: Array<any>,
): status.StatusOr<Array<T>> => {
  for (const doc of docs) {
    const maybeValidated = validate(validator, doc);
    if (!status.isOk(maybeValidated)) {
      return maybeValidated;
    }
  }

  return status.fromValue(docs as Array<T>);
};

/**
 * Constructs a validator that is the union of a set of validators.
 *
 * Typescript does a reasonably good job of making sure that JSONSchema and
 * Typescript interfaces are 1:1 aligned. If the JSONSchema does not match the
 * interface, Typescript will throw a compile error. EXCEPT this doesn't really
 * work for union types, e.g. Foo = Bar | Baz. See open ajv bug:
 * https://github.com/ajv-validator/ajv/issues/2211
 *
 * It's possible to use JSONSchema.anyOf or oneOf to get around this, and ajv
 * will do the right thing, but Typescript will no longer actually do the
 * typechecking to make sure the JSONSchema and the interface match.
 *
 * This function tries to make up the difference in behavior by constructing a
 * a 'fake' *validator* that operates as a union. Instead of creating the union
 * on the JSONSchema directly, we construct separate JSONSchemas for each
 * member of the union, and a separate validator for each schema, and then pass
 * those validators into this function.
 *
 * See: https://stackoverflow.com/q/75405517/3269537 for a more detailed
 * explanation of how the types work on this function.
 *
 * @param validators a list of validators that each map to one of the types
 *   that make up the union for the final type.
 *
 * @returns Validator that typeguards for the union type made up of each of the
 *   input validators.
 */
export const union = <T extends Array<any>>(
  validators: [...{ [I in keyof T]: Validator<T[I]> }],
): Validator<T[number]> => {
  const output = function (doc: any): doc is T {
    for (const validator of validators) {
      if (validator(doc)) {
        output.errors = null;
        output.schema = validator.schema;
        output.schemaEnv = validator.schemaEnv;
        return true;
      }

      if (validator.errors) {
        output.errors?.concat(validator.errors);
      }
    }
    return false;
  } as Validator<T>;

  return output;
};

/**
 * Constructs a validator that is the intersection of a set of validators.
 * NOTE: It is almost always better to simply merge properties directly on the
 * input schema, and create a validator from the merged schema, instead of
 * trying to create multiple validators and then merge those.
 *
 * For example:
 * ```
 * foo = {
 *   properties: { ... }
 * }
 * bar = {
 *   properties: { ... }
 * }
 *
 * intersection([
 *  compile(foo),
 *  compile(bar)
 * ])
 *
 * // is equivalent to
 * fooAndBar = {
 *   properties: { ...foo.properties, ...bar.properties }
 * }
 * compile(fooAndBar)
 * ```
 *
 * See `union()` for the explanation of the context behind this function.
 *
 * @param validators a list of validators that each map to one of the types
 *   that make up the union for the final type.
 *
 * @returns Validator that typeguards for the intersection type made up of each
 *   of the input validators.
 */
export const intersection = <T extends Array<any>>(
  validators: [...{ [I in keyof T]: Validator<T[I]> }],
): Validator<tsExtensions.MergeN<T>> => {
  const output = function (doc: any): doc is T {
    for (const validator of validators) {
      if (!validator(doc)) {
        output.errors = validator.errors;
        output.schema = validator.schema;
        output.schemaEnv = validator.schemaEnv;
        return false;
      }
    }

    return true;
  } as unknown as Validator<tsExtensions.MergeN<T>>;

  return output;
};

/**
 * Constructs a new schema given a base schema and property to remove from the
 * base schema.
 *
 * Example Usage:
 *
 * ```ts
 * const schema: Schema<{ foo: number, bar: string}> = { ... };
 * const schemaWithoutFoo: Schema<{ bar: string }> = omit(schema, 'foo');
 * ```
 *
 * @param inputSchema The base schema.
 * @param key The root-level key to remove from the base schema in the newly
 *   constructed schema.
 *
 * @returns Schema<Omit<T, K>>
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  inputSchema: Schema<T>,
  key: K,
): Schema<Omit<T, K>> => {
  const schema = _.cloneDeep(inputSchema);

  delete schema.properties[key];

  const requiredIndex = schema.required.indexOf(key);
  if (requiredIndex >= 0) {
    schema.required.splice(requiredIndex, 1);
  }

  return schema as Schema<Omit<T, K>>;
};

/**
 * Constructs a new schema given a base schema and property to mark as optional
 * from the base schema.
 *
 * Example Usage:
 *
 * ```ts
 * const schema: Schema<{ foo: number, bar: string}> = { ... };
 * const newSchema: Schema<{ foo?: number, bar: string }> = optional(schema, 'foo');
 * ```
 *
 * @param inputSchema The base schema.
 * @param key The root-level key to mark as optional from the base schema in the
 *   newly constructed schema.
 *
 * @returns The newly constructed schema.
 */
export const optional = <T extends Record<string, any>, K extends keyof T>(
  inputSchema: Schema<T>,
  key: K,
): Schema<Omit<T, K> & Record<K, T[K]>> => {
  const schema = _.cloneDeep(inputSchema);

  schema.properties[key].nullable = true;

  const requiredIndex = schema.required.indexOf(key);
  if (requiredIndex >= 0) {
    schema.required.splice(requiredIndex, 1);
  }

  return schema as Schema<Omit<T, K> & Record<K, T[K]>>;
};
