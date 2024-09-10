import humanizeDuration from 'humanize-duration';

import * as conversions from '@/duration/conversions';
import * as core from '@/duration/Duration';

export const toString = (duration: core.Duration): string => {
  if (core.isMilliseconds(duration)) {
    return `${duration.milliseconds}ms`;
  } else if (core.isSeconds(duration)) {
    return `${duration.seconds}s`;
  } else if (core.isMinutes(duration)) {
    return `${duration.minutes}m`;
  } else if (core.isHours(duration)) {
    return `${duration.hours}h`;
  }
  return `${duration.days}d`;
};

/**
 * Converts a duration into a string that is easier to read. Under the hood,
 * this uses humanize-duration
 * ({@link https://www.npmjs.com/package/humanize-duration}).
 *
 * @param duration - Duration to convert to human readable string.
 *
 * @returns A human readable string of the duration.
 */
export const toHumanReadableString = (duration: core.Duration) =>
  humanizeDuration(conversions.toMilliseconds(duration), {
    // The default behavior results in multiple units of time measure:
    // e.g. "3 months, 4 days, 2 hours, 3 minutes, and 30 seconds"
    //
    // This param limits the units to the single largest one:
    // e.g. "3 months"
    largest: 1,

    round: true,
  });
