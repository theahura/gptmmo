import * as status from '@gptmmo/status';

import { createCompiler, validate, omit, compile } from '@/schema';

import type { Compiler, Schema } from '@/schema';

let compiler: Compiler;
beforeAll(() => {
  compiler = createCompiler({ useDefaults: true });
});

test('Can remove a root field from a schema.', () => {
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

  const modifiedSchema = omit(schema, 'a');
  expect(modifiedSchema).toStrictEqual({
    type: 'object',
    properties: {
      b: {
        type: 'string',
      },
    },
    required: ['b'],
  });

  const validator = compile(compiler, modifiedSchema);

  const foo: status.StatusOr<Omit<Foo, 'a'>> = validate(validator, {
    b: 'foo',
  });
  expect(status.isOk(foo)).toBe(true);
});
