/**
 * This file directly implements the same interface as `DataSource` in
 * `./DataSource.ts` however with additional access control middleware. Readers
 * should defer to documentation there to understand behavior and motivations
 * for `DataSource` which all transfer to `PermissionedDataSource`.
 */

import * as status from '@gptmmo/status';

import * as accessControl from '@/docdb/AccessControl';

import type * as dataSource from '@/docdb/DataSource';
import type * as bson from 'bson';

/**
 * Note that `createPermissionedDataSource` differs from `createDataSource` in
 * that it accepts an access function which is used to define access control
 * rules for documents. It inspects documents and determines if they can be
 * accessed.
 *
 * @param args -
 * @param args.dataSource - A data source to wrap with additional permission
 *   rules.
 * @param args.canAccessDocument - The access function.
 *
 * @returns A DataSource which enforces access control rules.
 */
export const createPermissionedDataSource = <T extends bson.Document>(args: {
  dataSource: dataSource.DataSource<T>;
  canAccessDocument: accessControl.CanAccessDocumentFunction<T>;
}): dataSource.DataSource<T> => {
  const { dataSource, canAccessDocument } = args;

  return {
    findOneById: async (id) => {
      const maybeDocument = await dataSource.findOneById(id);
      if (!status.isOk(maybeDocument)) {
        return maybeDocument;
      }
      const document = maybeDocument.value;

      if (document == null) {
        return status.fromValue(null);
      }

      const approval = await accessControl.approveDocumentAccess({
        canAccessDocument,
        event: {
          type: accessControl.DocumentAccessType.READ,
          document,
        },
      });
      if (!status.isOk(approval)) {
        return approval;
      }

      return status.fromValue(document);
    },

    findManyByIds: async (ids) => {
      const documentMaybes = await dataSource.findManyByIds(ids);

      return Promise.all(
        documentMaybes.map(async (maybeDocument) => {
          if (!status.isOk(maybeDocument)) {
            return maybeDocument;
          }
          const document = maybeDocument.value;

          if (document == null) {
            return status.fromValue(null);
          }

          const approval = await accessControl.approveDocumentAccess({
            canAccessDocument,
            event: {
              type: accessControl.DocumentAccessType.READ,
              document,
            },
          });
          if (!status.isOk(approval)) {
            return approval;
          }

          return status.fromValue(document);
        }),
      );
    },
  };
};
