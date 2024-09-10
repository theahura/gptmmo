/**
 * Exports several common validators.
 */

import * as collections from '@gptmmo/collections';
import * as ajvKeywords from 'ajv-keywords';

import * as schema from '@/schema';

export const getStringValidator: collections.singleton.Factory<
  schema.Validator<string>
> = collections.singleton.fromFactory(() =>
  schema.compile<string>(schema.createCompiler({ useDefaults: true }), {
    type: 'string',
  }),
);

export const getNumberValidator: collections.singleton.Factory<
  schema.Validator<number>
> = collections.singleton.fromFactory(() =>
  schema.compile<number>(schema.createCompiler({ useDefaults: true }), {
    type: 'number',
  }),
);

export const getBooleanValidator: collections.singleton.Factory<
  schema.Validator<boolean>
> = collections.singleton.fromFactory(() =>
  schema.compile<boolean>(schema.createCompiler({ useDefaults: true }), {
    type: 'boolean',
  }),
);

export const getDateValidator: collections.singleton.Factory<
  schema.Validator<Date>
> = collections.singleton.fromFactory(() => {
  const compiler = schema.createCompiler({ useDefaults: true });

  // Install JS specific keywords such as (instanceof) to validate
  // non-serializable types.
  //
  // See https://ajv.js.org/packages/ajv-keywords.html
  ajvKeywords.default(compiler, ['instanceof']);

  return schema.compile<Date>(compiler, {
    type: 'object',
    instanceof: 'Date',
    required: [],
  });
});

export const getEmptyObjectValidator: collections.singleton.Factory<
  schema.Validator<Record<string, never>>
> = collections.singleton.fromFactory(() =>
  schema.compile<Record<string, never>>(
    schema.createCompiler({ useDefaults: true }),
    {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  ),
);
