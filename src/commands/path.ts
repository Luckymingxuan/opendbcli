import chalk from 'chalk';
import { PostgresDriver } from '../drivers/postgres.js';
import { getConnectionByName, getCurrentConnectionName } from './connect.js';

async function getDriverForConnection(connName?: string): Promise<{ driver: PostgresDriver; connName: string } | null> {
  const resolvedName = connName ?? await getCurrentConnectionName() ?? undefined;
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

interface Edge {
  toTable: string;
  fromColumn: string;
  toColumn: string;
  direction: 'outgoing' | 'incoming';
}

export async function showTablePath(connName: string | undefined, sourceTable: string, targetTable: string): Promise<void> {
  const result = await getDriverForConnection(connName);

  if (!result) {
    console.log(chalk.red(`Connection "${connName}" not found.`));
    console.log(chalk.cyan('Please use "dbcli connect <url>" to add the database first.'));
    process.exit(1);
  }

  const { driver, connName: databaseName } = result;

  try {
    const queryResult = await driver.query(`
      SELECT
        src.relname AS source_table,
        src_attr.attname AS source_column,
        tgt.relname AS target_table,
        tgt_attr.attname AS target_column
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      JOIN pg_class tgt ON tgt.oid = con.confrelid
      JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS src_col(attnum, ord) ON true
      JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS tgt_col(attnum, ord) ON src_col.ord = tgt_col.ord
      JOIN pg_attribute src_attr ON src_attr.attrelid = src.oid AND src_attr.attnum = src_col.attnum
      JOIN pg_attribute tgt_attr ON tgt_attr.attrelid = tgt.oid AND tgt_attr.attnum = tgt_col.attnum
      WHERE con.contype = 'f'
    `);

    const adjacency = new Map<string, Edge[]>();

    for (const row of queryResult.rows) {
      const src = String(row.source_table);
      const srcCol = String(row.source_column);
      const tgt = String(row.target_table);
      const tgtCol = String(row.target_column);

      if (!adjacency.has(src)) adjacency.set(src, []);
      adjacency.get(src)!.push({
        toTable: tgt,
        fromColumn: srcCol,
        toColumn: tgtCol,
        direction: 'outgoing'
      });

      if (!adjacency.has(tgt)) adjacency.set(tgt, []);
      adjacency.get(tgt)!.push({
        toTable: src,
        fromColumn: tgtCol,
        toColumn: srcCol,
        direction: 'incoming'
      });
    }

    if (!adjacency.has(sourceTable)) {
      console.log(chalk.yellow(`Table "${sourceTable}" not found or has no relations in database "${databaseName}".`));
      return;
    }
    if (!adjacency.has(targetTable)) {
      console.log(chalk.yellow(`Table "${targetTable}" not found or has no relations in database "${databaseName}".`));
      return;
    }

    // BFS
    type PathNode = { table: string; edgeFromPrev?: Edge };
    const queue: PathNode[][] = [[{ table: sourceTable }]];
    const visited = new Set<string>();
    visited.add(sourceTable);

    let foundPath: PathNode[] | null = null;

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1].table;

      if (current === targetTable) {
        foundPath = path;
        break;
      }

      const neighbors = adjacency.get(current) || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.toTable)) {
          visited.add(edge.toTable);
          queue.push([...path, { table: edge.toTable, edgeFromPrev: edge }]);
        }
      }
    }

    if (!foundPath) {
      console.log(chalk.yellow(`No relationship path found between "${sourceTable}" and "${targetTable}".`));
      return;
    }

    const tablesCount = foundPath.length - 2;
    
    console.log(chalk.cyan(`Path from ${sourceTable} to ${targetTable}`));
    console.log(chalk.gray('========================================'));
    console.log(chalk.white(`Intermediate tables: ${Math.max(0, tablesCount)}`));
    console.log();

    let visualPath = chalk.green(sourceTable);
    for (let i = 1; i < foundPath.length; i++) {
      const step = foundPath[i];
      const prevTable = foundPath[i-1].table;
      const edge = step.edgeFromPrev!;
      
      console.log(chalk.yellow(`Step ${i}:`) + ` ${prevTable} -> ${step.table}`);
      console.log(`  ${chalk.gray('Join condition:')} ${prevTable}.${chalk.blue(edge.fromColumn)} = ${step.table}.${chalk.blue(edge.toColumn)}`);
      
      visualPath += ` -> ${chalk.green(step.table)}`;
    }

    console.log();
    console.log(chalk.cyan('Overview:'));
    console.log(visualPath);

  } finally {
    await driver.disconnect();
  }
}
