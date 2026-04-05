/*
 * @Author: Mingxuan songmingxuan936@gmail.com
 * @Date: 2026-04-04 13:28:20
 * @LastEditors: Mingxuan songmingxuan936@gmail.com
 * @LastEditTime: 2026-04-04 13:28:41
 * @FilePath: /dbcli/src/drivers/interface.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by ${git_name_email}, All Rights Reserved. 
 */
export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  dataTypeID: number;
}

export interface TableInfo {
  schema: string;
  name: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  description: string | null;
}

export interface DatabaseDriver {
  connect(url: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query(sql: string): Promise<QueryResult>;
  listTables(): Promise<TableInfo[]>;
  describeTable(schema: string, table: string): Promise<ColumnInfo[]>;
}
