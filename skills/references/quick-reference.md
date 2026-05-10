# dbcli Skill Quick Reference

## Core Commands

- `dbcli --status`
  Shows saved connections and current active connection.

- `dbcli connect "postgresql://user:password@host:5432/database"`
  Creates or updates a saved connection and switches current connection.

- `dbcli connect <db-name>`
  Switches current connection to an existing saved connection.

- `dbcli list`
  Lists tables in current connection.

- `dbcli list <table>`
  Shows table columns as JSON metadata without descriptions.

- `dbcli pull`
  Syncs table names into the local description file for the current connection and archives removed table descriptions under `removed_tables`.

- `dbcli describe`
  Shows the full local description file, including the database description and all table descriptions.

- `dbcli describe <table>`
  Shows one table description from the local description file.

- `dbcli describe --tables`
  Shows all table descriptions as JSON.

- `dbcli describe --database`
  Shows the database description as JSON.

- `dbcli import --file <path>`
  Imports descriptions from a JSON file. The file may contain only `database`, only `tables`, or both.

- `dbcli import '<json>'`
  Imports descriptions from a JSON string. The `tables` object may include one table, a few tables, or many tables.

- `dbcli schema <table>`
  Shows compact DDL-like structure for one table.

- `dbcli related <table>`
  Shows related table names split by direction:
  - `outgoing_related_tables`
  - `incoming_related_tables`

- `dbcli query "<sql>"`
  Executes SQL against current connection.

- `dbcli skill --output <path>`
  Exports the full skills bundle to `<path>/dbcli-skills`.

## Suggested Flow

1. `dbcli --status`
2. `dbcli connect <db-name>` or `dbcli connect "<url>"`
3. `dbcli list`
4. `dbcli pull`
5. `dbcli import --file <path>` or `dbcli import '<json>'` when database or table descriptions need to be updated
6. `dbcli describe` or `dbcli describe <table>`
7. `dbcli schema <table>` + `dbcli related <table>`
8. `dbcli query "<sql>"`
9. `dbcli skill --output <path>` when the full skill bundle needs to be shared or installed elsewhere

## Common Errors

- Connection not found:
  Use `dbcli --status`, then `dbcli connect <db-name>`.

- Missing URL credentials:
  Use format `postgresql://user:password@host:5432/database`.

- Table not found:
  Run `dbcli list` and use exact name.

- Description file not found:
  Run `dbcli pull` first.

- Import payload rejected:
  Use a JSON object with `database`, `tables`, or both, then make sure the tables already exist in the current synced description file.
