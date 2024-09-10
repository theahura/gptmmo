/**
 * This file enumerates all primary key types used by the persistence lib. These
 * are all defined in one place rather than colocated with the DocDB Collection
 * they represent to allow for data-model cycles which are expressed like so:
 *
 * ```ts
 * import * as primaryKeys from '@/primaryKeys';
 *
 * type FooCollection = {
 *   _id: primaryKeys.Foo;
 *   sibling: primaryKeys.Bar;
 * }
 *
 * type BarCollection = {
 *   _id: primaryKeys.Bar;
 *   sibling: primaryKeys.Foo;
 * }
 * ```
 */

import type * as tsExtensions from '@gptmmo/ts-extensions';

export type Room = tsExtensions.Flavor<string, 'Room'>;
