export const dateDifferenceToString = (a: Date, b: Date) => {
  // Ensure epoch1 is greater (more recent) than epoch2
  let differenceInSeconds = Math.abs(a.getTime() / 1000 - b.getTime() / 1000);

  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day; // Approximating 1 month as 30 days
  const year = 365 * day; // Approximating 1 year as 365 days

  if (differenceInSeconds >= year) {
    const years = Math.floor(differenceInSeconds / year);
    return years === 1 ? '1 year' : `${years} years`;
  } else if (differenceInSeconds >= month) {
    const months = Math.floor(differenceInSeconds / month);
    return months === 1 ? '1 month' : `${months} months`;
  } else if (differenceInSeconds >= week) {
    const weeks = Math.floor(differenceInSeconds / week);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else if (differenceInSeconds >= day) {
    const days = Math.floor(differenceInSeconds / day);
    return days === 1 ? '1 day' : `${days} days`;
  } else if (differenceInSeconds >= hour) {
    const hours = Math.floor(differenceInSeconds / hour);
    return hours === 1 ? '1 hour' : `${hours} hours`;
  } else if (differenceInSeconds >= minute) {
    const minutes = Math.floor(differenceInSeconds / minute);
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  } else {
    return differenceInSeconds === 1
      ? '1 second'
      : `${differenceInSeconds} seconds`;
  }
};
