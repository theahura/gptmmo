import * as status from '@gptmmo/status';

import { createCompiler, compile, validate } from '@/schema';

import type { Compiler, Schema } from '@/schema';

let compiler: Compiler;
beforeAll(() => {
  compiler = createCompiler({ useDefaults: true });
});

type Foo = {
  name: 'FOO';
  message: string;
};

test('Make sure basic schema validation works as expected.', () => {
  const FooSchema: Schema<Foo> = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        const: 'FOO',
      },
      message: {
        type: 'string',
      },
    },
    required: ['name', 'message'],
    additionalProperties: false,
  };

  // FooSchema and Foo must exactly match, or TS will throw a compilation err.
  const validator = compile<Foo>(compiler, FooSchema);

  const fooDoc = {
    name: 'FOO',
    message: 'it was a bright cold day in April, and the clocks struck 13',
  };

  const barDoc = {
    name: 'BAR',
  };

  // At run time.
  expect(status.isOk(validate(validator, fooDoc))).toBe(true);
  expect(status.isOk(validate(validator, barDoc))).toBe(false);

  const barDocWithMessage = {
    name: 'BAR',
    message:
      'surely if I add a message field I can sneak through the validator?',
  };
  expect(status.isOk(validate(validator, barDocWithMessage))).toBe(false);
});
