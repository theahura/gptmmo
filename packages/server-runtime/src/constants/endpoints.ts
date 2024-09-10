import * as serverEnvironment from '@gptmmo/server-environment';

export const API_SERVER: serverEnvironment.EnvironmentSelector<string> = {
  [serverEnvironment.Environment.LOCAL]: 'http://localhost:8082',
  [serverEnvironment.Environment.DEV]: 'UNIMPLEMENTED',
  [serverEnvironment.Environment.STAGING]:
    'UNIMPLEMENTED',
  [serverEnvironment.Environment.PRODUCTION]: 'UNIMPLEMENTED',
};

export const FRONTEND_CLIENTS: serverEnvironment.EnvironmentSelector<
  Array<string | RegExp>
> = {
  [serverEnvironment.Environment.LOCAL]: [
    // Default address for node processes
    'http://localhost:3000',

    // Web app
    'http://localhost:5004',
  ],
  [serverEnvironment.Environment.DEV]: [
    'http://localhost:5004', // Web app
  ],

  // TODO(ganesh): Update these URLs once we deploy to these environments.
  [serverEnvironment.Environment.STAGING]: [
    'UNIMPLEMENTED_FRONTEND_CLIENT:',
  ],
  [serverEnvironment.Environment.PRODUCTION]: ['UNIMPLEMENTED_FRONTEND_CLIENT'],
};
