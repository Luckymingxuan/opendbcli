import chalk from 'chalk';
import { PostgresDriver } from '../drivers/postgres.js';
import { getConnectionByName, getCurrentConnectionName } from './connect.js';

async function getDriverForConnection(connName?: string): Promise<{ driver: PostgresDriver; connName: string } | null> {
  const resolvedName = connName ?? await getCurrentConnectionName() ?? undefined;
  if (!resolvedName) {
    return null;
  }

  const connection = await getConnectionByName(resolvedName);
  if (!connection) {
    return null;
  }

  const url = new URL(connection.url);
  url.username = connection.username;
  url.password = connection.password;

  const driver = new PostgresDriver();
  await driver.connect(url.toString());

  return { driver, connName: resolvedName };
}

export async function executeQuery(connName: string | undefined, sql: string): Promise<void> {
  const result = await getDriverForConnection(connName);

  if (!result) {
    console.log(chalk.red(`Connection "${connName}" not found.`));
    console.log(chalk.cyan('Please use "dbcli connect <url>" to add the database first.'));
    process.exit(1);
  }

  const { driver, connName: databaseName } = result;

  try {
    console.log(chalk.gray(`Executing on database "${databaseName}":`));
    console.log(chalk.cyan(sql));
    console.log();

    const queryResult = await driver.query(sql);

    if (queryResult.rows.length === 0) {
      console.log(chalk.yellow(`Query executed successfully. No rows returned.`));
      console.log(chalk.gray(`Row count: ${queryResult.rowCount}`));
    } else {
      console.table(queryResult.rows);
      console.log(chalk.gray(`Total: ${queryResult.rows.length} row(s)`));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Query failed: ${message}`));
    process.exit(1);
  } finally {
    await driver.disconnect();
  }
}
