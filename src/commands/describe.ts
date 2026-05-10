import chalk from 'chalk';
import { PostgresDriver } from '../drivers/postgres.js';
import { createEmptyDescribeFile, getDescribeFilePath, readDescribeFile, readDescribeFileOrExit, writeDescribeFile } from './descriptions.js';
import type { DescribeFile } from './descriptions.js';
import { getConnectionByName, getCurrentConnectionName } from './connect.js';

export interface DescribeOptions {
  database?: boolean;
  tables?: boolean;
}

async function getDriverForCurrentConnection(): Promise<{ driver: PostgresDriver; connName: string } | null> {
  const resolvedName = await getCurrentConnectionName() ?? undefined;
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


export async function pullDescriptions(): Promise<void> {
  const result = await getDriverForCurrentConnection();

  if (!result) {
    console.log(chalk.red('No current connection found.'));
    console.log(chalk.cyan('Please use "dbcli connect <url>" to add the database first.'));
    process.exit(1);
  }

  const { driver, connName } = result;

  try {
    const tableRows = await driver.listTables();
    const currentTableNames = Array.from(new Set(
      tableRows
        .filter((table) => table.schema === 'public')
        .map((table) => table.name),
    )).sort((a, b) => a.localeCompare(b));

    const describeFile = await readDescribeFile(connName) ?? createEmptyDescribeFile();
    const previousTableNames = Object.keys(describeFile.tables).sort((a, b) => a.localeCompare(b));
    const previousRemovedTableNames = Object.keys(describeFile.removed_tables).sort((a, b) => a.localeCompare(b));
    const currentTableSet = new Set(currentTableNames);

    const nextTables: Record<string, string> = {};
    const nextRemovedTables = { ...describeFile.removed_tables };
    const restoredTables: string[] = [];

    for (const tableName of currentTableNames) {
      if (tableName in describeFile.tables) {
        nextTables[tableName] = describeFile.tables[tableName];
        continue;
      }

      if (tableName in describeFile.removed_tables) {
        nextTables[tableName] = describeFile.removed_tables[tableName];
        delete nextRemovedTables[tableName];
        restoredTables.push(tableName);
        continue;
      }

      nextTables[tableName] = '';
    }

    const removedTables = previousTableNames.filter((tableName) => !currentTableSet.has(tableName));
    for (const tableName of removedTables) {
      nextRemovedTables[tableName] = describeFile.tables[tableName] ?? '';
    }

    const restoredTableSet = new Set(restoredTables);
    const addedTables = currentTableNames.filter((tableName) => !(tableName in describeFile.tables) && !restoredTableSet.has(tableName));
    const unchangedTables = currentTableNames.filter((tableName) => tableName in describeFile.tables);

    const nextDescribeFile: DescribeFile = {
      version: 1,
      database: describeFile.database,
      tables: nextTables,
      removed_tables: nextRemovedTables,
    };

    await writeDescribeFile(connName, nextDescribeFile);

    const payload = {
      database: connName,
      description_file: getDescribeFilePath(connName),
      added_tables: addedTables,
      removed_tables: removedTables,
      restored_tables: restoredTables.sort((a, b) => a.localeCompare(b)),
      unchanged_tables: unchangedTables,
      archived_removed_tables: Object.keys(nextRemovedTables).sort((a, b) => a.localeCompare(b)),
      updated: addedTables.length > 0
        || removedTables.length > 0
        || restoredTables.length > 0
        || previousTableNames.length === 0
        || previousRemovedTableNames.length !== Object.keys(nextRemovedTables).length,
    };

    console.log(chalk.cyan('Description Sync'));
    console.log(chalk.gray('================'));
    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await driver.disconnect();
  }
}

export async function describe(tableName: string | undefined, options: DescribeOptions): Promise<void> {
  const connectionName = await getCurrentConnectionName();

  if (!connectionName) {
    console.log(chalk.red('No current connection found.'));
    console.log(chalk.cyan('Please use "dbcli connect <url>" to add the database first.'));
    process.exit(1);
  }

  const modeCount = [options.database, options.tables, Boolean(tableName)].filter(Boolean).length;
  if (modeCount > 1) {
    console.log(chalk.red('Please choose only one describe target: a table name, --tables, or --database.'));
    process.exit(1);
  }

  const describeFile = await readDescribeFileOrExit(connectionName);

  if (options.database) {
    console.log(JSON.stringify({
      database: describeFile.database,
    }, null, 2));
    return;
  }

  if (options.tables) {
    console.log(JSON.stringify({
      tables: describeFile.tables,
    }, null, 2));
    return;
  }

  if (tableName) {
    if (!(tableName in describeFile.tables)) {
      console.log(chalk.red(`Table "${tableName}" not found in description file for database "${connectionName}".`));
      console.log(chalk.cyan('Run "dbcli pull" first to sync current table names.'));
      process.exit(1);
    }

    console.log(JSON.stringify({
      table: tableName,
      description: describeFile.tables[tableName],
    }, null, 2));
    return;
  }

  console.log(JSON.stringify(describeFile, null, 2));
}
