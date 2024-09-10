import Ajv from 'ajv';

import { createCompiler, compile } from '@/schema';

import type { Compiler, Schema, SomeSchema } from '@/schema';

let compiler: Compiler;
beforeAll(() => {
  compiler = createCompiler({ useDefaults: true });
});

test('Make sure duplicate schema $ids compile without issue.', () => {
  const ajv = new Ajv();

  const DSchema: SomeSchema = {
    $id: './D',
    type: 'object',
    properties: {},
    required: [],
  };

  const CSchema: SomeSchema = {
    $id: './C',
    type: 'object',
    properties: {},
    required: [],
    definitions: {
      DSchema,
    },
  };

  const BSchema: SomeSchema = {
    $id: './B',
    type: 'object',
    properties: {},
    required: [],
    definitions: {
      DSchema,
    },
  };

  const ASchema: Schema<any> = {
    $id: './A',
    type: 'object',
    properties: {},
    required: [],
    definitions: {
      BSchema,
      CSchema,
    },
  };

  // Note: you have to pass a function to check exceptions, as per:
  // https://stackoverflow.com/a/46155381/3269537
  expect(() => {
    ajv.compile(ASchema);
  }).toThrow(Error);
  expect(() => {
    compile(compiler, ASchema);
  }).not.toThrow(Error);
});
