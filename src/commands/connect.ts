import chalk from 'chalk';
import inquirer from 'inquirer';
import { PostgresDriver } from '../drivers/postgres.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

interface ConnectionInfo {
  url: string;
  database: string;
  lastConnected: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.dbcli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'connections.json');

let currentDriver: PostgresDriver | null = null;
let currentDatabase: string | null = null;
let connections: Map<string, ConnectionInfo> = new Map();

async function loadConnections(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(data) as Record<string, ConnectionInfo>;
    connections = new Map(Object.entries(parsed));
  } catch {
    connections = new Map();
  }
}

async function saveConnections(): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const obj = Object.fromEntries(connections);
  await fs.writeFile(CONFIG_FILE, JSON.stringify(obj, null, 2), 'utf-8');
}

export function getDriver(): PostgresDriver | null {
  return currentDriver;
}

export function getCurrentDatabase(): string | null {
  return currentDatabase;
}

export function listConnections(): Map<string, ConnectionInfo> {
  return connections;
}

async function promptCredentials(): Promise<{ username: string; password: string }> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Username:',
      default: 'postgres',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
    },
  ]);
  return answers;
}

export async function showConnections(): Promise<void> {
  await loadConnections();

  if (connections.size === 0) {
    console.log(chalk.yellow('No saved connections.'));
    console.log(chalk.cyan('Use "dbcli connect <url>" to save a connection.'));
    return;
  }

  console.log(chalk.cyan('Saved connections:'));
  const rows = Array.from(connections.entries()).map(([name, info]) => ({
    name,
    database: info.database,
    lastConnected: info.lastConnected,
    current: name === currentDatabase ? '*' : '',
  }));
  console.table(rows);
}

export async function connect(urlStr: string): Promise<void> {
  await loadConnections();

  if (currentDriver?.isConnected()) {
    await currentDriver.disconnect();
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    console.error(chalk.red('Invalid URL format'));
    process.exit(1);
  }

  if (!url.username || !url.password) {
    console.log(chalk.cyan('Please enter your credentials:'));
    const credentials = await promptCredentials();
    url.username = credentials.username;
    url.password = credentials.password;
  }

  const database = url.pathname.slice(1) || 'postgres';

  currentDriver = new PostgresDriver();

  try {
    console.log(chalk.cyan(`Connecting to "${database}"...`));
    await currentDriver.connect(url.toString());
    currentDatabase = database;

    connections.set(database, {
      url: url.toString(),
      database,
      lastConnected: new Date().toISOString(),
    });
    await saveConnections();

    console.log(chalk.green(`Connected to "${database}" successfully!`));
    console.log(chalk.gray('Press any key to exit...'));
    await new Promise<void>((resolve) => {
      process.stdin.setRawMode?.(true);
      process.stdin.resume?.();
      process.stdin.once('data', () => {
        process.stdin.setRawMode?.(false);
        process.exit(0);
      });
    });
  } catch (error) {
    currentDriver = null;
    currentDatabase = null;
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Connection failed: ${message}`));
    process.exit(1);
  }
}

export async function disconnect(): Promise<void> {
  if (currentDriver) {
    await currentDriver.disconnect();
    currentDriver = null;
    currentDatabase = null;
    console.log(chalk.yellow('Disconnected.'));
  }
}
