import chalk from 'chalk';
import inquirer from 'inquirer';
import { PostgresDriver } from '../drivers/postgres.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

interface ConnectionInfo {
  url: string;
  database: string;
  host: string;
  port: number;
  username: string;
  password: string;
  lastConnected: string;
  enabled: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.dbcli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'connections.json');

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

export function getConnections(): Map<string, ConnectionInfo> {
  return connections;
}

export async function getActiveConnection(): Promise<ConnectionInfo | null> {
  await loadConnections();
  for (const conn of connections.values()) {
    if (conn.enabled) {
      return conn;
    }
  }
  return null;
}

export async function getConnectionByName(name: string): Promise<ConnectionInfo | null> {
  await loadConnections();
  return connections.get(name) || null;
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

function isUrl(str: string): boolean {
  return str.includes('://');
}

function buildUrl(info: ConnectionInfo, username: string, password: string): string {
  return `postgresql://${username}:${password}@${info.host}:${info.port}/${info.database}`;
}

export async function showConnections(): Promise<void> {
  await loadConnections();

  if (connections.size === 0) {
    console.log(chalk.yellow('No saved connections.'));
    console.log(chalk.cyan('Use "dbcli connect <url>" to add a new connection.'));
    return;
  }

  console.log(chalk.cyan('Saved connections:'));
  const rows = Array.from(connections.entries()).map(([name, info]) => ({
    name,
    database: info.database,
    host: info.host,
    port: info.port,
    status: info.enabled ? 'enabled' : 'disabled',
    lastConnected: info.lastConnected,
  }));
  console.table(rows);
}

export async function deleteConnection(name: string): Promise<void> {
  await loadConnections();

  if (!connections.has(name)) {
    console.error(chalk.red(`Connection "${name}" not found.`));
    process.exit(1);
  }

  connections.delete(name);
  await saveConnections();
  console.log(chalk.yellow(`Connection "${name}" deleted.`));
}

export async function connect(nameUrl: string): Promise<void> {
  await loadConnections();

  let database: string;
  let host: string;
  let port: number;
  let existing: ConnectionInfo | null = null;
  let urlUsername = '';
  let urlPassword = '';

  if (isUrl(nameUrl)) {
    const url = new URL(nameUrl);
    database = url.pathname.slice(1) || 'postgres';
    host = url.hostname;
    port = parseInt(url.port) || 5432;
    urlUsername = url.username;
    urlPassword = url.password;
    existing = connections.get(database) || null;
  } else {
    database = nameUrl;
    existing = connections.get(database) || null;
    if (!existing) {
      console.error(chalk.red(`Connection "${database}" not found.`));
      console.log(chalk.cyan('Use "dbcli connect <url>" to add a new connection.'));
      process.exit(1);
    }
    host = existing.host;
    port = existing.port;
  }

  let credentials: { username: string; password: string };
  if (urlUsername || urlPassword) {
    credentials = { username: urlUsername, password: urlPassword };
  } else {
    credentials = await promptCredentials();
  }

  let finalUrl: string;
  if (existing) {
    finalUrl = buildUrl(existing, credentials.username, credentials.password);
  } else {
    finalUrl = `postgresql://${credentials.username}:${credentials.password}@${host}:${port}/${database}`;
  }

  const driver = new PostgresDriver();

  try {
    console.log(chalk.cyan(`Connecting to "${database}"...`));
    await driver.connect(finalUrl);

    for (const conn of connections.values()) {
      conn.enabled = false;
    }

    const connectionInfo: ConnectionInfo = {
      url: `postgresql://${host}:${port}/${database}`,
      database,
      host,
      port,
      username: credentials.username,
      password: credentials.password,
      lastConnected: new Date().toISOString(),
      enabled: true,
    };

    connections.set(database, connectionInfo);
    await saveConnections();

    console.log(chalk.green(`Connected to "${database}" successfully!`));
    console.log(chalk.gray('Press any key to exit...'));

    await new Promise<void>((resolve) => {
      process.stdin.setRawMode?.(true);
      process.stdin.resume?.();
      process.stdin.once('data', () => {
        process.stdin.setRawMode?.(false);
        driver.disconnect();
        process.exit(0);
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Connection failed: ${message}`));
    process.exit(1);
  }
}

export async function disconnect(name: string): Promise<void> {
  await loadConnections();

  if (!connections.has(name)) {
    console.error(chalk.red(`Connection "${name}" not found.`));
    process.exit(1);
  }

  const conn = connections.get(name)!;
  conn.enabled = false;
  conn.username = '';
  conn.password = '';
  await saveConnections();

  console.log(chalk.yellow(`Disconnected from "${name}". Username and password cleared.`));
}
