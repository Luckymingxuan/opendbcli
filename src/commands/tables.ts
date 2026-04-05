import chalk from 'chalk';
import { PostgresDriver } from '../drivers/postgres.js';
import { getActiveConnection } from './connect.js';

async function getActiveDriver(): Promise<{ driver: PostgresDriver; connName: string } | null> {
  const activeConn = await getActiveConnection();
  if (!activeConn) {
    return null;
  }

  const url = `postgresql://${activeConn.username}:${activeConn.password}@${activeConn.host}:${activeConn.port}/${activeConn.database}`;
  const driver = new PostgresDriver();
  await driver.connect(url);

  const connName = activeConn.database;
  return { driver, connName };
}

export async function listTables(): Promise<void> {
  const result = await getActiveDriver();

  if (!result) {
    console.log(chalk.red('No active database connection.'));
    console.log(chalk.cyan('Please use "dbcli connect <url>" to connect to a database first.'));
    process.exit(1);
  }

  const { driver, connName } = result;

  try {
    const tables = await driver.listTables();

    if (tables.length === 0) {
      console.log(chalk.yellow(`No tables found in database "${connName}".`));
    } else {
      console.log(chalk.cyan(`Tables in database "${connName}":`));
      console.table(tables);
    }
  } finally {
    await driver.disconnect();
  }
}

export async function describeTable(tableName: string): Promise<void> {
  const result = await getActiveDriver();

  if (!result) {
    console.log(chalk.red('No active database connection.'));
    console.log(chalk.cyan('Please use "dbcli connect <url>" to connect to a database first.'));
    process.exit(1);
  }

  const { driver, connName } = result;

  try {
    const columns = await driver.describeTable('public', tableName);

    if (columns.length === 0) {
      console.log(chalk.yellow(`Table "${tableName}" not found in database "${connName}".`));
    } else {
      console.log(chalk.cyan(`Structure of table "${tableName}" in database "${connName}":`));
      console.table(columns);
    }
  } finally {
    await driver.disconnect();
  }
}