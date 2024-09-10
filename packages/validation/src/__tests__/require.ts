import { requires, requiresAbsence, replaceDefinitions } from '@/schema';

import type { Schema } from '@/schema';

type Foo = {
  a: string;
  b: string;
  c: string;
};

type Bar = {
  z: string;
  foo: Foo;
};

test('Make sure requires constructs expected schema types.', () => {
  const foo: Schema<Foo> = {
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
      b: {
        type: 'string',
      },
      c: {
        type: 'string',
      },
    },
    required: ['c'],
  };

  expect(requires(foo, '*').required.sort()).toEqual(['a', 'b', 'c']);
  expect(requires(foo, ['a']).required.sort()).toEqual(['a', 'c']);
  expect(requires(foo, ['a'], /* invert */ true).required.sort()).toEqual([
    'b',
    'c',
  ]);
  expect(
    requires(foo, ['a'], /* invert */ false, /* override */ true).required,
  ).toEqual(['a']);
  expect(
    requires(foo, ['a', 'a', 'a'], /* invert */ false, /* override */ true)
      .required,
  ).toEqual(['a']);
});

test('Make sure requiresAbsence constructs expected schema types.', () => {
  const fooOne: Schema<Foo> = {
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
      b: {
        type: 'string',
      },
      c: {
        type: 'string',
      },
    },
    required: [],
  };

  expect(requiresAbsence(fooOne, ['a']).not.required).toEqual(['a']);
  expect(
    requiresAbsence(fooOne, ['a'], /* invert */ true).not.required.sort(),
  ).toEqual(['b', 'c']);
  const fooTwo: Schema<Foo> = {
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
      b: {
        type: 'string',
      },
      c: {
        type: 'string',
      },
    },
    required: [],
    not: {
      required: ['c'],
    },
  };

  expect(
    requiresAbsence(fooTwo, ['a'], /* invert */ false, /* override */ true).not
      .required,
  ).toEqual(['a']);
  expect(
    requiresAbsence(
      fooTwo,
      ['a', 'a', 'a'],
      /* invert */ false,
      /* override */ true,
    ).not.required,
  ).toEqual(['a']);
});

test('Make sure replaceDefinitions constructs expected schema types.', () => {
  const foo: Schema<Foo> = {
    type: 'object',
    properties: {
      a: {
        type: 'string',
      },
      b: {
        type: 'string',
      },
      c: {
        type: 'string',
      },
    },
    required: [],
  };

  const bar: Schema<Bar> = {
    type: 'object',
    properties: {
      z: {
        type: 'string',
      },
      foo: {
        $ref: 'Foo',
      },
    },
    definitions: {
      Foo: foo,
    },
    required: [],
  };

  expect(
    replaceDefinitions(bar, {
      Foo: requires(foo, '*'),
    }).definitions?.Foo.required.sort(),
  ).toEqual(['a', 'b', 'c']);
});
