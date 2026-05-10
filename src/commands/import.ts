import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentConnectionName } from './connect.js';
import { getDescribeFilePath, readDescribeFileOrExit, writeDescribeFile } from './descriptions.js';

interface ImportOptions {
  file?: string;
}

interface ImportPayload {
  database?: string;
  tables?: Record<string, string>;
}

function parseImportPayload(raw: string): ImportPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Import payload must be valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Import payload must be a JSON object.');
  }

  const candidate = parsed as Record<string, unknown>;
  const allowedKeys = new Set(['database', 'tables']);
  const unknownKeys = Object.keys(candidate).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`Unsupported top-level keys: ${unknownKeys.join(', ')}.`);
  }

  const payload: ImportPayload = {};

  if ('database' in candidate) {
    if (typeof candidate.database !== 'string') {
      throw new Error('"database" must be a string.');
    }
    payload.database = candidate.database;
  }

  if ('tables' in candidate) {
    if (typeof candidate.tables !== 'object' || candidate.tables === null || Array.isArray(candidate.tables)) {
      throw new Error('"tables" must be an object mapping table names to description strings.');
    }

    const normalizedEntries = Object.entries(candidate.tables).map(([tableName, description]) => {
      if (typeof description !== 'string') {
        throw new Error(`Table description for "${tableName}" must be a string.`);
      }

      return [tableName, description] as const;
    });

    payload.tables = Object.fromEntries(normalizedEntries);
  }

  if (payload.database === undefined && payload.tables === undefined) {
    throw new Error('Import payload must include "database", "tables", or both.');
  }

  return payload;
}

async function loadImportPayload(input: string | undefined, options: ImportOptions): Promise<ImportPayload> {
  if (input && options.file) {
    throw new Error('Use either a JSON string argument or --file, not both.');
  }

  if (!input && !options.file) {
    throw new Error('Provide a JSON string argument or use --file <path>.');
  }

  if (options.file) {
    const filePath = path.resolve(process.cwd(), options.file);
    const content = await fs.readFile(filePath, 'utf-8');
    return parseImportPayload(content);
  }

  return parseImportPayload(input ?? '');
}

export async function importDescriptions(input: string | undefined, options: ImportOptions): Promise<void> {
  const connectionName = await getCurrentConnectionName();

  if (!connectionName) {
    console.log(chalk.red('No current connection found.'));
    console.log(chalk.cyan('Please use "dbcli connect <url>" to add the database first.'));
    process.exit(1);
  }

  let payload: ImportPayload;
  try {
    payload = await loadImportPayload(input, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(message));
    process.exit(1);
  }

  const describeFile = await readDescribeFileOrExit(connectionName);
  const incomingTables = payload.tables ? Object.keys(payload.tables).sort((a, b) => a.localeCompare(b)) : [];
  const unknownTables = incomingTables.filter((tableName) => !(tableName in describeFile.tables));

  if (unknownTables.length > 0) {
    console.log(chalk.red(`Unknown active tables in import payload: ${unknownTables.join(', ')}.`));
    console.log(chalk.cyan('Run "dbcli pull" first to sync current table names, then retry the import.'));
    process.exit(1);
  }

  const nextDescribeFile = {
    ...describeFile,
    database: payload.database ?? describeFile.database,
    tables: {
      ...describeFile.tables,
      ...(payload.tables ?? {}),
    },
  };

  await writeDescribeFile(connectionName, nextDescribeFile);

  const updatedTables = incomingTables.filter((tableName) => {
    return payload.tables?.[tableName] !== undefined && describeFile.tables[tableName] !== payload.tables[tableName];
  });

  const databaseUpdated = payload.database !== undefined && payload.database !== describeFile.database;

  console.log(JSON.stringify({
    updated: databaseUpdated || updatedTables.length > 0,
    database: connectionName,
    description_file: getDescribeFilePath(connectionName),
    database_updated: databaseUpdated,
    updated_tables: updatedTables,
  }, null, 2));
}
