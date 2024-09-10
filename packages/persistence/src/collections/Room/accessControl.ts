import * as status from '@gptmmo/status';

import type * as types from '@/types';
import type * as lib from '@gptmmo/lib';

export const createAccessControlFunction =
  (): lib.docdb.CanAccessDocumentFunction<types.Room> => () =>
    status.fromValue(true);
