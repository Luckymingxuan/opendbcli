#!/usr/bin/env node
import { Command } from 'commander';
import { connect, disconnect, showConnections as statusConnections } from './commands/connect.js';
import { listTables, describeTable, showRelatedTables, showTableSchema } from './commands/tables.js';
import { executeQuery } from './commands/query.js';
import { skill } from './commands/skill.js';

const program = new Command();

program
  .name('dbcli')
  .description('Database CLI tool')
  .version('0.1.0')
  .addHelpCommand(false);

program
  .command('connect')
  .description('Connect by URL or switch to an existing connection by name')
  .argument('<url-or-db-name>', 'Database URL or saved connection name')
  .action(async (input: string) => {
    await connect(input);
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
  .description('Remove a saved database connection')
  .argument('[db-name]', 'Connection name to disconnect (defaults to current connection)')
  .action(async (name?: string) => {
    await disconnect(name);
  });

program
  .command('tables')
  .description('List all tables in the current database')
  .action(async () => {
    await listTables();
  });

program
  .command('describe')
  .description('Show the structure of a table')
  .argument('<table>', 'Table name to describe in current connection')
  .action(async (table: string) => {
    await describeTable(undefined, table);
  });

program
  .command('schema')
  .description('Show a table schema in a compact DDL-style format')
  .argument('<table>', 'Table name to inspect in current connection')
  .action(async (table: string) => {
    await showTableSchema(undefined, table);
  });

program
  .command('related')
  .description('Show tables related to the specified table and the linking fields')
  .argument('<table>', 'Table name to inspect relationships for in current connection')
  .action(async (table: string) => {
    await showRelatedTables(undefined, table);
  });

program
  .command('query')
  .description('Execute a SQL query')
  .argument('<sql>', 'SQL query to execute on current connection (use quotes for complex queries)')
  .action(async (sql: string) => {
    await executeQuery(undefined, sql);
  });

program
  .command('skill')
  .description('Print skill markdown or write it to a file')
  .option('--output <path>', 'Write skill markdown to a file')
  .action(async (options: { output?: string }) => {
    await skill(options);
  });

program.parse();
