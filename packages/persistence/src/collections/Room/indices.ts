import * as status from '@gptmmo/status';

import type * as types from '@/types';
import type * as lib from '@gptmmo/lib';

export const configureIndices = async (
  collection: lib.docdb.PermissionedCollection<types.Room>,
): Promise<void> => {
  const results = [
    // Supports pagination over allocated files within a single upload manifest.
    // Hence structuring the index as first on upload index and second on _id
    // which we use as a cursor-pagination discriminator.
    await collection.createIndex(
      {
        uploadManifest: -1,
        _id: -1,
      },
      {
        background: true,
      },
    ),
  ];

  for (const result of results) {
    if (!status.isOk(result)) {
      console.warn(`Failed to create index with error: ${result.error}`);
    }
  }
};
