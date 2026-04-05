#!/usr/bin/env node
import { Command } from 'commander';
import { connect, disconnect, logout, showConnections as statusConnections, deleteConnection } from './commands/connect.js';
import { listTables, describeTable } from './commands/tables.js';
import { executeQuery } from './commands/query.js';

const program = new Command();

program
  .name('dbcli')
  .description('Database CLI tool')
  .version('0.1.0')
  .addHelpCommand(false);

program
  .command('connect')
  .description('Connect to a database (-u <user> -p <pass> for credentials, -c to use current)')
  .argument('<db-name|url>', 'Connection name (for existing) or full URL (for new connection)')
  .option('-u, --username <username>', 'Username for authentication')
  .option('-p, --password <password>', 'Password for authentication')
  .option('-c, --current', 'Use credentials from currently connected database')
  .action(async (nameUrl: string, options) => {
    await connect(nameUrl, options);
  });

program
  .option('-s, --status', 'Show all saved connections status')
  .action(async (options, cmd) => {
    if (cmd.args && cmd.args.length > 0) {
      console.error(`error: unknown command '${cmd.args[0]}'`);
      process.exit(1);
    }
    if (options.status) {
      await statusConnections();
      process.exit(0);
    }
  });

program
  .command('disconnect')
  .description('Disconnect from a database (keeps credentials)')
  .argument('<db-name>', 'Connection name to disconnect')
  .action(async (name: string) => {
    await disconnect(name);
  });

program
  .command('logout')
  .description('Logout from a connection (clears credentials)')
  .argument('<db-name>', 'Connection name to logout')
  .action(async (name: string) => {
    await logout(name);
  });

program
  .command('delete')
  .description('Delete a saved connection completely')
  .argument('<db-name>', 'Connection name to delete')
  .action(async (name: string) => {
    await deleteConnection(name);
  });

program
  .command('tables')
  .description('List all tables in the connected database')
  .action(async () => {
    await listTables();
  });

program
  .command('describe')
  .description('Show the structure of a table')
  .argument('<table>', 'Table name to describe')
  .action(async (table: string) => {
    await describeTable(table);
  });

program
  .command('query')
  .description('Execute a SQL query')
  .argument('<sql>', 'SQL query to execute (use quotes for complex queries)')
  .action(async (sql: string) => {
    await executeQuery(sql);
  });

program.parse();
