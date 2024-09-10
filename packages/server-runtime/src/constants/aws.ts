/**
 * We have a lot of AWS resources that the `gptmmo-server-runtime` needs to
 * coordinate with by name/id/arn. This file enumerates AWS resource information
 * for each environment.
 *
 * Most of these values are consumed by `providers/` which configures external
 * API clients and `secrets/` which fetches AWS secrets.
 *
 * Note: for constants that depend on localstack configuration, check the
 * localstack/ folder. The appropriate terraform configs will often explicitly
 * define names for the constants. Relatedly, the localstack configs and the
 * constants in this file must be kept in sync.
 */

import * as serverEnvironment from '@gptmmo/server-environment';

// We only deploy resources to us-east-1.
export const REGION = 'us-east-1';

/// LocalStack

export const LOCALSTACK_ENDPOINT = {
  [serverEnvironment.Environment.LOCAL]: 'http://localhost:4566',
};

export const LOCALSTACK_CREDENTIALS = {
  accessKeyId: 'test',
  secretAccessKey: 'test',
};

/// DocDB

// Each kubernetes cluster configures the service "docdb" to point to that
// environment's DocDB cluster, for this reason all non-local environments use
// the same URL.
export const DOCDB_URL: serverEnvironment.EnvironmentSelector<string> = {
  [serverEnvironment.Environment.LOCAL]: 'mongodb://localhost:27017',
  [serverEnvironment.Environment.DEV]:
    'UNIMPLEMENTED',
  [serverEnvironment.Environment.STAGING]:
    'UNIMPLEMENTED',
  [serverEnvironment.Environment.PRODUCTION]:
    'UNIMPLEMENTED',
};

export const DOCDB_CREDENTIALS_SECRET_NAME: serverEnvironment.DeployedEnvironmentSelector<string> =
  {
    [serverEnvironment.Environment.DEV]: 'UNIMPLEMENTED',
    [serverEnvironment.Environment.STAGING]: 'UNIMPLEMENTED',
    [serverEnvironment.Environment.PRODUCTION]: 'UNIMPLEMENTED',
  };

export const DOCDB_DATABASE_NAME: serverEnvironment.EnvironmentSelector<string> =
  {
    [serverEnvironment.Environment.LOCAL]: 'gptmmo-local',
    [serverEnvironment.Environment.DEV]: 'gptmmo-dev',
    [serverEnvironment.Environment.STAGING]: 'gptmmo-staging',
    [serverEnvironment.Environment.PRODUCTION]: 'gptmmo-prod',
  };
