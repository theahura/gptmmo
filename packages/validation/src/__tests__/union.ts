import { createCompiler, compile, union } from '@/schema';

import type { Compiler, Schema, Validator } from '@/schema';

let compiler: Compiler;
beforeAll(() => {
  compiler = createCompiler({ useDefaults: true });
});

type FooOne = {
  a: string;
  discriminator: 'ONE';
};

type FooTwo = {
  a: string;
  discriminator: 'TWO';
  extraField: string;
};

type Foo = FooOne | FooTwo;

test('Make sure union schema validation works as expected.', () => {
  // A union validator is meant to validate a union type, e.g. string | number.
  // This is equivalent to the anyOf operator in a JSONSchema. It may appear
  // when, for e.g., we have a data structure with a field that has one or more
  // extensions (Instances, Objects).
  //
  // This test models the extension use case by used two types which have some
  // overlapping and some non-overlapping fields and then uses a union to
  // evaluate types which would match either type.

  const FooOneSchema: Schema<FooOne> = {
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
      discriminator: {
        type: 'string',
        const: 'ONE',
      },
    },
    required: ['a'],
  };

  const FooTwoSchema: Schema<FooTwo> = {
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
      discriminator: {
        type: 'string',
        const: 'TWO',
      },
      extraField: {
        type: 'string',
      },
    },
    required: ['a'],
  };

  const validator: Validator<Foo> = union([
    compile<FooOne>(compiler, FooOneSchema),
    compile<FooTwo>(compiler, FooTwoSchema),
  ]);

  // Match the FooOne schema.
  const fooOne = {
    discriminator: 'ONE',
    a: 'But soft!',
  };
  expect(validator(fooOne)).toEqual(true);

  // Match the FooTwo schema.
  const fooTwo = {
    discriminator: 'TWO',
    a: 'what light through yonder window breaks?',
    extraField: 'It is the east, and Juliet is the sun.',
  };
  expect(validator(fooTwo)).toEqual(true);

  // Fails because field 'a' is not a number in our type/schema.
  const notFoo = {
    a: 1,
  };
  expect(validator(notFoo)).toEqual(false);

  // Fails because field 'a' is not present even though other fields are, and
  // 'a' is required.
  const alsoNotFoo = {
    discriminator: 'ONE',
    missingAField: 'if I dont have the "a" base field, can I sneak through?',
  };
  expect(validator(alsoNotFoo)).toEqual(false);
});
