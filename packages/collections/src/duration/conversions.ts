import * as core from '@/duration/Duration';

export const toMilliseconds = (duration: core.Duration): number => {
  if (core.isMilliseconds(duration)) {
    return duration.milliseconds;
  } else if (core.isSeconds(duration)) {
    return duration.seconds * 1000;
  } else if (core.isMinutes(duration)) {
    return duration.minutes * 1000 * 60;
  } else if (core.isHours(duration)) {
    return duration.hours * 1000 * 60 * 60;
  }
  return duration.days * 1000 * 60 * 60 * 24;
};

export const toSeconds = (duration: core.Duration): number => {
  if (core.isMilliseconds(duration)) {
    return duration.milliseconds / 1000;
  } else if (core.isSeconds(duration)) {
    return duration.seconds;
  } else if (core.isMinutes(duration)) {
    return duration.minutes * 60;
  } else if (core.isHours(duration)) {
    return duration.hours * 60 * 60;
  }
  return duration.days * 60 * 60 * 24;
};

export const toMinutes = (duration: core.Duration): number => {
  if (core.isMilliseconds(duration)) {
    return duration.milliseconds / 60 / 1000;
  } else if (core.isSeconds(duration)) {
    return duration.seconds / 60;
  } else if (core.isMinutes(duration)) {
    return duration.minutes;
  } else if (core.isHours(duration)) {
    return duration.hours * 60;
  }
  return duration.days * 60 * 24;
};

export const toHours = (duration: core.Duration): number => {
  if (core.isMilliseconds(duration)) {
    return duration.milliseconds / 60 / 60 / 1000;
  } else if (core.isSeconds(duration)) {
    return duration.seconds / 60 / 60;
  } else if (core.isMinutes(duration)) {
    return duration.minutes / 60;
  } else if (core.isHours(duration)) {
    return duration.hours;
  }
  return duration.days * 24;
};

export const toDays = (duration: core.Duration): number => {
  if (core.isMilliseconds(duration)) {
    return duration.milliseconds / 24 / 60 / 60 / 1000;
  } else if (core.isSeconds(duration)) {
    return duration.seconds / 24 / 60 / 60;
  } else if (core.isMinutes(duration)) {
    return duration.minutes / 24 / 60;
  } else if (core.isHours(duration)) {
    return duration.hours / 24;
  }
  return duration.days;
};
