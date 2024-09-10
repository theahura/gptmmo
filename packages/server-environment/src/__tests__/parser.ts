import * as status from '@gptmmo/status';

import * as environmentParser from '@/parser';
import { Environment } from '@/types';

describe('parseEnvironment', () => {
  test('LOCAL string returns Environment.LOCAL.', () => {
    expect(environmentParser.parseEnvironment('LOCAL')).toStrictEqual(
      status.fromValue(Environment.LOCAL),
    );
    expect(environmentParser.parseEnvironment('local')).toStrictEqual(
      status.fromValue(Environment.LOCAL),
    );
  });

  test('DEVELOPMENT string returns Environment.DEV.', () => {
    expect(environmentParser.parseEnvironment('DEVELOPMENT')).toStrictEqual(
      status.fromValue(Environment.DEV),
    );
    expect(environmentParser.parseEnvironment('development')).toStrictEqual(
      status.fromValue(Environment.DEV),
    );
  });

  test('DEV string returns Environment.DEV.', () => {
    expect(environmentParser.parseEnvironment('DEV')).toStrictEqual(
      status.fromValue(Environment.DEV),
    );
    expect(environmentParser.parseEnvironment('dev')).toStrictEqual(
      status.fromValue(Environment.DEV),
    );
  });

  test('STAGING string returns Environment.STAGING.', () => {
    expect(environmentParser.parseEnvironment('STAGING')).toStrictEqual(
      status.fromValue(Environment.STAGING),
    );
    expect(environmentParser.parseEnvironment('staging')).toStrictEqual(
      status.fromValue(Environment.STAGING),
    );
  });

  test('PRODUCTION string returns Environment.PRODUCTION.', () => {
    expect(environmentParser.parseEnvironment('PRODUCTION')).toStrictEqual(
      status.fromValue(Environment.PRODUCTION),
    );
    expect(environmentParser.parseEnvironment('production')).toStrictEqual(
      status.fromValue(Environment.PRODUCTION),
    );
  });

  test('PROD string returns Environment.PRODUCTION.', () => {
    expect(environmentParser.parseEnvironment('PROD')).toStrictEqual(
      status.fromValue(Environment.PRODUCTION),
    );
    expect(environmentParser.parseEnvironment('prod')).toStrictEqual(
      status.fromValue(Environment.PRODUCTION),
    );
  });

  test('Unknown environment returns error.', () => {
    const maybeEnvironment = environmentParser.parseEnvironment('foobar');
    expect(status.isOk(maybeEnvironment)).toBe(false);
  });

  test('Empty string returns error.', () => {
    const maybeEnvironment = environmentParser.parseEnvironment('');
    expect(status.isOk(maybeEnvironment)).toBe(false);
  });
});
