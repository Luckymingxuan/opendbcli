/*
 * @Author: Mingxuan songmingxuan936@gmail.com
 * @Date: 2026-04-05 17:01:59
 * @LastEditors: Mingxuan songmingxuan936@gmail.com
 * @LastEditTime: 2026-04-05 17:42:59
 * @FilePath: /dbcli/src/drivers/postgres.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by ${git_name_email}, All Rights Reserved. 
 */
import pg from 'pg';
import type { DatabaseDriver, QueryResult, TableInfo, ColumnInfo } from './interface.js';

export class PostgresDriver implements DatabaseDriver {
  private client: pg.PoolClient | null = null;
  private pool: pg.Pool | null = null;
  private connected = false;

  async connect(url: string): Promise<void> {
    const connectionUrl = new URL(url);

    this.pool = new pg.Pool({
      host: connectionUrl.hostname,
      port: parseInt(connectionUrl.port) || 5432,
      user: connectionUrl.username,
      password: connectionUrl.password,
      database: connectionUrl.pathname.slice(1) || 'postgres',
      ssl: connectionUrl.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : undefined,
    });

    this.client = await this.pool.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const result = await this.client.query(sql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
      fields: result.fields.map((f: pg.FieldDef) => ({
        name: f.name,
        dataTypeID: f.dataTypeID,
      })),
    };
  }

  async listTables(): Promise<TableInfo[]> {
    const result = await this.query(`
      SELECT schemaname as schema, tablename as name
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
    `);
    return result.rows as unknown as TableInfo[];
  }

  async describeTable(schema: string, table: string): Promise<ColumnInfo[]> {
    const result = await this.query(`
      SELECT
        a.attname as name,
        format_type(a.atttypid, a.atttypmod) as data_type,
        CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END as is_nullable,
        pg_get_expr(ad.adbin, a.attrelid) as default_value,
        col_description(a.attrelid, a.attnum) as description
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
      WHERE n.nspname = $1
        AND c.relname = $2
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    `, [schema, table]);
    return result.rows as unknown as ColumnInfo[];
  }
}
