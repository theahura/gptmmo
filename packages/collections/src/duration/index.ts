/**
 * This module contains types for defining durations with units for example
 * `{ seconds: 1 }` as well as utilities for managing durations.
 *
 * Example Usage:
 *
 * ```ts
 * setTimeout(() => {
 *   ...
 * }, duration.toMilliseconds({ hours: 1 }));
 * ```
 */

export * from '@/duration/Duration';
export * from '@/duration/conversions';
export * from '@/duration/debounce';
export * from '@/duration/rateLimit';
export * from '@/duration/sleep';
export * from '@/duration/timeout';
export * from '@/duration/toString';
