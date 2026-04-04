import { Command } from 'commander';
import { connect, disconnect, showConnections, deleteConnection } from './commands/connect.js';

const program = new Command();

program
  .name('dbcli')
  .description('Database CLI tool')
  .version('0.1.0');

program
  .command('connect')
  .description('Connect to a database')
  .argument('<name|url>', 'Connection name (for existing) or full URL (for new connection)')
  .action(async (nameUrl: string) => {
    await connect(nameUrl);
  });

program
  .command('show')
  .description('Show all saved connections')
  .action(async () => {
    await showConnections();
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

program.parse();
