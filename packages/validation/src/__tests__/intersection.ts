import { createCompiler, compile, intersection, requires } from '@/schema';

import type { Compiler, Schema, Validator } from '@/schema';

type FooOne = {
  a: string;
  discriminator: 'ONE';
};

type FooTwo = {
  a: string;
  extraField: string;
};

type Foo = FooOne | FooTwo;

let compiler: Compiler;
beforeAll(() => {
  compiler = createCompiler({ useDefaults: true });
});

test('Make sure intersection schema validation works as expected.', () => {
  // An intersection validator is meant to validate an intersection type, e.g.
  // string & number. This is equivalent to the allOf operator in a JSONSchema.
  //
  // Although it is possible to represent intersection using validators, it is
  // almost always preferrable to simply construct a single schema with the
  // intersection 'built in' by merging properties, much the same way we do
  // with 'extended' subschemas below.

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
    required: [],
  };

  const FooTwoSchema: Schema<FooTwo> = {
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
      extraField: {
        type: 'string',
      },
    },
    required: [],
  };

  const validator: Validator<Foo> = intersection([
    compile<FooOne>(compiler, requires(FooOneSchema, '*')),
    compile<FooTwo>(compiler, requires(FooTwoSchema, '*')),
  ]);

  // Match the FooOne schema only. Should fail because we don't have the fields
  // from FooTwo.
  const fooOne = {
    discriminator: 'ONE',
    a: 'you lost the game',
  };
  expect(validator(fooOne)).toEqual(false);

  // Match the FooTwo schema only. Should fail because we don't have the fields
  // from FooOne.
  const fooTwo = {
    a: 'i know a song that gets on everybodys nerves...',
    extraField: '...and this is how it goes!',
  };
  expect(validator(fooTwo)).toEqual(false);

  // Fails because field 'a' is not a number in our type/schema.
  const notFoo = {
    a: 1,
  };
  expect(validator(notFoo)).toEqual(false);

  // Fails because field 'a' is not present even though other fields are.
  const alsoNotFoo = {
    discriminator: 'ONE',
    extraField: 'first!',
  };
  expect(validator(alsoNotFoo)).toEqual(false);

  // Succeed because we actually have all required fields.
  const foo = {
    discriminator: 'ONE',
    a: 'now that im an adult,',
    extraField: 'all those other things seem so juvenile',
  };
  expect(validator(foo)).toEqual(true);
});
