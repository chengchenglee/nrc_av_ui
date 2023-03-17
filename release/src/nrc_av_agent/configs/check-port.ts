/* eslint-disable import/no-extraneous-dependencies */
import chalk from 'chalk';
import detectPort from 'detect-port';
import * as dotenv from 'dotenv';

dotenv.config();
const port = Number(process.env.VITE_PORT);
detectPort(port, (err: unknown, availablePort: unknown) => {
  if (port !== availablePort) {
    // eslint-disable-next-line no-console
    console.log(
      `${chalk.whiteBright.bold('⚠️  localhost port')} ${chalk.red.bold(
        port
      )} ${chalk.whiteBright.bold(
        'already in use!!! please use another port. 👉 Ex: Change VITE_PORT port number✨'
      )} `
    );
    process.exit(1);
  }
});
