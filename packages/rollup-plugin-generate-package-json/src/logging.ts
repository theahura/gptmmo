/**
 * A collection of colored logging functions for better terminal legibility.
 */

import chalk from 'chalk';

export const warn = (message: string) => {
  console.warn(`${chalk.yellow('[WARN]')} ${message}`);
};
