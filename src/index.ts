#!/usr/bin/env node
import { Command } from 'commander';
import { connect, disconnect, showConnections as statusConnections } from './commands/connect.js';
import { pullDescriptions, describe } from './commands/describe.js';
import { importDescriptions } from './commands/import.js';
import { listTables, listTableColumns, showRelatedTables, showTableSchema } from './commands/tables.js';
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
  .command('list')
  .description('List all tables or show a table column structure in JSON')
  .argument('[table]', 'Optional table name to inspect in current connection')
  .action(async (table?: string) => {
    if (table) {
      await listTableColumns(undefined, table);
      return;
    }

    await listTables();
  });

program
  .command('describe')
  .description('Read database and table descriptions')
  .argument('[table]', 'Optional table name to describe')
  .option('--tables', 'Show all table descriptions')
  .option('--database', 'Show the database description')
  .action(async (table: string | undefined, options: { tables?: boolean; database?: boolean }) => {
    await describe(table, options);
  });

program
  .command('pull')
  .description('Sync table names into the local description file')
  .action(async () => {
    await pullDescriptions();
  });

program
  .command('import')
  .description('Import database and table descriptions from JSON')
  .argument('[json]', 'Optional JSON string containing "database" and/or "tables"')
  .option('--file <path>', 'Load the JSON payload from a file path')
  .action(async (json: string | undefined, options: { file?: string }) => {
    await importDescriptions(json, options);
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
  .description('Print SKILL.md or export the full skills bundle')
  .option('--output <path>', 'Export skills folder to <path>/dbcli-skills')
  .action(async (options: { output?: string }) => {
    await skill(options);
  });

program.parse();
