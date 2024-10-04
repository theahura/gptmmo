import * as fs from 'fs';

export const log = (log: string, data?: any) => {
  if (data) {
    const jsonified = JSON.stringify(data, null, 2);
    const withDate = `${new Date().toISOString()}: ${log}: ${jsonified}\n`;
    fs.appendFile('session.log', withDate, (err) => {
      if (err) throw err;
    });
    return;
  }

  const withDate = `${new Date().toISOString()}: ${log}\n`;
  fs.appendFile('session.log', withDate, (err) => {
    if (err) throw err;
  });
};
