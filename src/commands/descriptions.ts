import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { CONFIG_DIR } from './connect.js';

export interface DescribeFile {
  version: 1;
  database: string;
  tables: Record<string, string>;
  removed_tables: Record<string, string>;
}

const DESCRIPTIONS_DIR = path.join(CONFIG_DIR, 'descriptions');

function sanitizeConnectionName(connectionName: string): string {
  return connectionName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function getDescribeFilePath(connectionName: string): string {
  return path.join(DESCRIPTIONS_DIR, `${sanitizeConnectionName(connectionName)}.json`);
}

export function createEmptyDescribeFile(): DescribeFile {
  return {
    version: 1,
    database: '',
    tables: {},
    removed_tables: {},
  };
}

function normalizeStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, typeof entryValue === 'string' ? entryValue : '']),
  );
}

export async function ensureDescriptionsDir(): Promise<void> {
  await fs.mkdir(DESCRIPTIONS_DIR, { recursive: true });
}

export async function readDescribeFile(connectionName: string): Promise<DescribeFile | null> {
  try {
    const filePath = getDescribeFilePath(connectionName);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as Partial<DescribeFile>;

    return {
      version: 1,
      database: typeof parsed.database === 'string' ? parsed.database : '',
      tables: normalizeStringMap(parsed.tables),
      removed_tables: normalizeStringMap((parsed as { removed_tables?: unknown }).removed_tables),
    };
  } catch {
    return null;
  }
}

export async function readDescribeFileOrExit(connectionName: string): Promise<DescribeFile> {
  const describeFile = await readDescribeFile(connectionName);
  if (!describeFile) {
    console.log(chalk.red(`Description file not found for database "${connectionName}".`));
    console.log(chalk.cyan('Run "dbcli pull" first to initialize the description file.'));
    process.exit(1);
  }

  return describeFile;
}

export async function writeDescribeFile(connectionName: string, payload: DescribeFile): Promise<void> {
  await ensureDescriptionsDir();
  const filePath = getDescribeFilePath(connectionName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}
