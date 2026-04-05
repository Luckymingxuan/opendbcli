import { Command } from 'commander';
import { connect, disconnect, showConnections as statusConnections, deleteConnection } from './commands/connect.js';
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
  .description('Connect to a database')
  .argument('<name|url>', 'Connection name (for existing) or full URL (for new connection)')
  .action(async (nameUrl: string) => {
    await connect(nameUrl);
  });

program
  .command('status')
  .description('Show all saved connections status')
  .action(async () => {
    await statusConnections();
  });

program
  .command('disconnect')
  .description('Disconnect a connection (keeps URL, only disables)')
  .argument('<name>', 'Connection name to disconnect')
  .action(async (name: string) => {
    await disconnect(name);
  });

program
  .command('delete')
  .description('Delete a saved connection completely')
  .argument('<name>', 'Connection name to delete')
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
