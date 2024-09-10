import { createCompiler, getOrCompile } from '@/schema';

import type { Schema } from '@/schema';

test('Caches validators by schema and compiler references.', () => {
  const schema: Schema<{ foo: number }> = {
    type: 'object',
    properties: {
      foo: { type: 'number' },
    },
    required: ['foo'],
  };

  const compiler = createCompiler({ useDefaults: true });
  jest.spyOn(compiler, 'compile');

  const firstValidator = getOrCompile(compiler, schema);
  expect(compiler.compile).toHaveBeenCalledTimes(1);

  const secondValidator = getOrCompile(compiler, schema);
  expect(compiler.compile).toHaveBeenCalledTimes(1);

  expect(firstValidator).toBe(secondValidator);
});

test('Different schema references compile to different validators.', () => {
  const schema: Schema<{ foo: number }> = {
    type: 'object',
    properties: {
      foo: { type: 'number' },
    },
    required: ['foo'],
  };

  const compiler = createCompiler({ useDefaults: true });
  jest.spyOn(compiler, 'compile');

  const firstValidator = getOrCompile(compiler, { ...schema });
  expect(compiler.compile).toHaveBeenCalledTimes(1);

  const secondValidator = getOrCompile(compiler, { ...schema });
  expect(compiler.compile).toHaveBeenCalledTimes(2);

  expect(firstValidator).not.toBe(secondValidator);
});

test('Different compiler references compile to different validators.', () => {
  const schema: Schema<{ foo: number }> = {
    type: 'object',
    properties: {
      foo: { type: 'number' },
    },
    required: ['foo'],
  };

  const firstCompiler = createCompiler({ useDefaults: true });
  jest.spyOn(firstCompiler, 'compile');

  const firstValidator = getOrCompile(firstCompiler, schema);
  expect(firstCompiler.compile).toHaveBeenCalledTimes(1);

  const secondCompiler = createCompiler({ useDefaults: true });
  jest.spyOn(secondCompiler, 'compile');

  const secondValidator = getOrCompile(secondCompiler, schema);
  expect(secondCompiler.compile).toHaveBeenCalledTimes(1);

  expect(firstValidator).not.toBe(secondValidator);
});
