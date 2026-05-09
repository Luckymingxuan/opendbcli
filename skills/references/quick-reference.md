# dbcli Skill Quick Reference

## Core Commands

- `dbcli --status`
  Shows saved connections and current active connection.

- `dbcli connect "postgresql://user:password@host:5432/database"`
  Creates or updates a saved connection and switches current connection.

- `dbcli connect <db-name>`
  Switches current connection to an existing saved connection.

- `dbcli tables`
  Lists tables in current connection.

- `dbcli schema <table>`
  Shows compact DDL-like structure for one table.

- `dbcli describe <table>`
  Shows detailed table columns as JSON metadata.

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
3. `dbcli tables`
4. `dbcli schema <table>` + `dbcli related <table>`
5. `dbcli query "<sql>"`
6. `dbcli skill --output <path>` when the full skill bundle needs to be shared or installed elsewhere

## Common Errors

- Connection not found:
  Use `dbcli --status`, then `dbcli connect <db-name>`.

- Missing URL credentials:
  Use format `postgresql://user:password@host:5432/database`.

- Table not found:
  Run `dbcli tables` and use exact name.
