import * as status from '@gptmmo/status';

import { createCompiler, validate, optional, compile } from '@/schema';

import type { Compiler, Schema } from '@/schema';

let compiler: Compiler;
beforeAll(() => {
  compiler = createCompiler({ useDefaults: true });
});

test('Can make a root field optional.', () => {
  type Foo = { a: number; b: string };
  const schema: Schema<Foo> = {
    type: 'object',
    properties: {
      a: {
        type: 'number',
      },
      b: {
        type: 'string',
      },
    },
    required: ['a', 'b'],
  };

  const modifiedSchema = optional(schema, 'a');
  expect(modifiedSchema).toStrictEqual({
    type: 'object',
    properties: {
      a: {
        type: 'number',
        nullable: true,
      },
      b: {
        type: 'string',
      },
    },
    required: ['b'],
  });

  const validator = compile(compiler, modifiedSchema);

  const foo: status.StatusOr<{
    a?: number;
    b: string;
  }> = validate(validator, { b: 'foo' });
  expect(status.isOk(foo)).toBe(true);
});

test('No-ops for an already optional field.', () => {
  type Foo = { a?: number; b: string };
  const schema: Schema<Foo> = {
    type: 'object',
    properties: {
      a: {
        type: 'number',
        nullable: true,
      },
      b: {
        type: 'string',
      },
    },
    required: ['b'],
  };

  const modifiedSchema = optional(schema, 'a');
  expect(modifiedSchema).toStrictEqual(schema);
});
