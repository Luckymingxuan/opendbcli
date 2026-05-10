import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { PostgresDriver } from '../drivers/postgres.js';
import { CONFIG_DIR, getConnectionByName, getCurrentConnectionName } from './connect.js';

interface DescribeFile {
  version: 1;
  database: string;
  tables: Record<string, string>;
}

interface DescribeOptions {
  database?: boolean;
  tables?: boolean;
  set?: string;
}

const DESCRIPTIONS_DIR = path.join(CONFIG_DIR, 'descriptions');

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

function sanitizeConnectionName(connectionName: string): string {
  return connectionName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function getDescribeFilePath(connectionName: string): string {
  return path.join(DESCRIPTIONS_DIR, `${sanitizeConnectionName(connectionName)}.json`);
}

function createEmptyDescribeFile(): DescribeFile {
  return {
    version: 1,
    database: '',
    tables: {},
  };
}

async function ensureDescriptionsDir(): Promise<void> {
  await fs.mkdir(DESCRIPTIONS_DIR, { recursive: true });
}

async function readDescribeFile(connectionName: string): Promise<DescribeFile | null> {
  try {
    const filePath = getDescribeFilePath(connectionName);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as Partial<DescribeFile>;

    return {
      version: 1,
      database: typeof parsed.database === 'string' ? parsed.database : '',
      tables: parsed.tables && typeof parsed.tables === 'object' ? Object.fromEntries(
        Object.entries(parsed.tables).map(([key, value]) => [key, typeof value === 'string' ? value : '']),
      ) : {},
    };
  } catch {
    return null;
  }
}

async function readDescribeFileOrExit(connectionName: string): Promise<DescribeFile> {
  const describeFile = await readDescribeFile(connectionName);
  if (!describeFile) {
    console.log(chalk.red(`Description file not found for database "${connectionName}".`));
    console.log(chalk.cyan('Run "dbcli pull" first to initialize the description file.'));
    process.exit(1);
  }

  return describeFile;
}

async function writeDescribeFile(connectionName: string, payload: DescribeFile): Promise<void> {
  await ensureDescriptionsDir();
  const filePath = getDescribeFilePath(connectionName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
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
    const currentTableSet = new Set(currentTableNames);

    const nextTables: Record<string, string> = {};
    for (const tableName of currentTableNames) {
      nextTables[tableName] = describeFile.tables[tableName] ?? '';
    }

    const removedTables = previousTableNames.filter((tableName) => !currentTableSet.has(tableName));
    const addedTables = currentTableNames.filter((tableName) => !(tableName in describeFile.tables));
    const unchangedTables = currentTableNames.filter((tableName) => tableName in describeFile.tables);

    const nextDescribeFile: DescribeFile = {
      version: 1,
      database: describeFile.database,
      tables: nextTables,
    };

    await writeDescribeFile(connName, nextDescribeFile);

    const payload = {
      database: connName,
      description_file: getDescribeFilePath(connName),
      added_tables: addedTables,
      removed_tables: removedTables,
      unchanged_tables: unchangedTables,
      updated: addedTables.length > 0 || removedTables.length > 0 || previousTableNames.length === 0,
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

  if (options.set !== undefined) {
    if (options.tables) {
      console.log(chalk.red('Cannot use --set with --tables.'));
      process.exit(1);
    }

    if (options.database) {
      const nextPayload: DescribeFile = {
        ...describeFile,
        database: options.set,
      };
      await writeDescribeFile(connectionName, nextPayload);
      console.log(JSON.stringify({
        updated: true,
        target: 'database',
        database: nextPayload.database,
      }, null, 2));
      return;
    }

    if (!tableName) {
      console.log(chalk.red('Use "dbcli describe <table> --set <text>" or "dbcli describe --database --set <text>".'));
      process.exit(1);
    }

    if (!(tableName in describeFile.tables)) {
      console.log(chalk.red(`Table "${tableName}" not found in description file for database "${connectionName}".`));
      console.log(chalk.cyan('Run "dbcli pull" first to sync current table names.'));
      process.exit(1);
    }

    const nextPayload: DescribeFile = {
      ...describeFile,
      tables: {
        ...describeFile.tables,
        [tableName]: options.set,
      },
    };
    await writeDescribeFile(connectionName, nextPayload);
    console.log(JSON.stringify({
      updated: true,
      target: 'table',
      table: tableName,
      description: nextPayload.tables[tableName],
    }, null, 2));
    return;
  }

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
