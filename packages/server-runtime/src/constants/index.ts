/**
 * Most constants in this module are private, however, a few constants are
 * exposed to clients of the GPTMMO Server Runtime. For example, workers need the
 * SQS Queue URL they poll from. This file exposes those public constants.
 */

export type Constants = {
  docDB: {
    databaseName: string;
  };

  endpoints: {
    apiServer: string;
    frontendClients: Array<string | RegExp>;
  };
};
