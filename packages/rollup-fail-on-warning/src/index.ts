/**
 * Allows clients to elevate rollup warnings to failures.
 */

import type * as rollup from 'rollup';

/**
 * Describes when a warning should be elevated to a failure.
 */
export type Rule = {
  // Enumerates all warning codes which will match this rule.
  codes: Array<string>;

  // The failure reason emitted as compiler output should any warnings matching
  // the above codes.
  reason: string;
};

/**
 * Given rules which describe which warnings should be elevated to failures
 * returns a rollup warning handler which will apply those rules when applied
 * via `onwarn`.
 *
 * Example Usage:
 *
 * ```ts
 * import failOnWarning from '@gptmmo/rollup-fail-on-warning';
 *
 * export default {
 *   ...
 *   onwarn: failOnWarning([
 *     {
 *       codes: ['FOO'],
 *       reason: 'Foo is disallowed. See go/style#no-foo',
 *     },
 *   ]),
 * }
 * ```
 *
 * @param rules The rules governing which warnings should be elevated to
 *   failures.
 *
 * @returns A warning handler for use with rollup's `onwarn` config option.
 *
 *   ts-prune-ignore-next
 */
export default (rules: Array<Rule>): rollup.WarningHandlerWithDefault =>
  (warning, warn) => {
    for (const rule of rules) {
      if (warning.code != null && rule.codes.indexOf(warning.code) >= 0) {
        throw Object.assign(new Error(), {
          ...warning,
          message:
            `Warnings of type ${warning.code} are treated as errors ` +
            `because ${rule.reason}. The original error was: ` +
            warning.message,
        });
      }
    }

    // When no rules apply, default to the built-in warning implementation.
    warn(warning);
  };
