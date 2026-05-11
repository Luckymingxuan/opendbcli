# dbcli Agent Database Handbook

## 1) Core Goal

`dbcli` exists to help AI agents understand and operate on the database layer directly, instead of relying only on API-level abstractions.

The core product direction is:

- Make schema structure easy to inspect.
- Make table relationships explicit before query generation.
- Keep business-oriented database/table descriptions in a local, editable source.
- Let agents update those descriptions in a controlled workflow.

In short: improve agent-level database understanding quality, then improve downstream SQL quality and task completion reliability.

## 2) High-Level Architecture

`dbcli` has four main layers:

1. CLI layer (`src/index.ts`)
   - Exposes command entry points such as `connect`, `list`, `pull`, `describe`, `import`, `schema`, `related`, `query`, and `skill`.

2. Command layer (`src/commands/*.ts`)
   - Implements user-facing behavior for connection management, schema inspection, description sync/update, query execution, and skill export.

3. Driver layer (`src/drivers/postgres.ts`)
   - Provides PostgreSQL-specific data access (tables, columns, relationships, SQL execution).

4. Local state layer (`~/.dbcli`)
   - Persists saved connections and per-database description files for agent context continuity.

## 3) Command Reference (Detailed)

### Connection and status

- `dbcli --status`
  - Shows all saved connections and the current active one.

- `dbcli connect "postgresql://user:password@host:5432/database"`
  - Creates/updates a saved connection and switches current connection.

- `dbcli connect <db-name>`
  - Switches to an existing saved connection by name.

- `dbcli disconnect [db-name]`
  - Removes a saved connection. If omitted, removes the current one.

### Schema discovery

- `dbcli list`
  - Lists tables in the current database.

- `dbcli list <table>`
  - Shows JSON column metadata for one table.

- `dbcli schema <table>`
  - Shows compact DDL-style schema output for one table.

- `dbcli related <table>`
  - Shows incoming/outgoing related tables for join planning.

### Description lifecycle

- `dbcli pull`
  - Syncs current active table names into local description storage.
  - Adds new tables with empty descriptions.
  - Moves removed tables into `removed_tables`.
  - Restores archived descriptions if a removed table reappears.

- `dbcli describe`
  - Shows the full description file (`database`, `tables`, `removed_tables`).

- `dbcli describe <table>`
  - Shows one table description.

- `dbcli describe --tables`
  - Shows all table descriptions only.

- `dbcli describe --database`
  - Shows database description only.

- `dbcli import --file <path>`
  - Imports description updates from a JSON file.

- `dbcli import '<json>'`
  - Imports description updates from a JSON string.
  - Accepted top-level keys are only `database` and `tables`.
  - Unknown active table names are rejected; run `dbcli pull` first.

### Query execution

- `dbcli query "<sql>"`
  - Executes SQL against the current connection.

### Skill distribution

- `dbcli skill`
  - Prints `SKILL.md` content.

- `dbcli skill --output <path>`
  - Exports the full skills bundle to `<path>/dbcli-skills`.
  - This exported bundle can be shared with or installed into agent environments.

## 4) Recommended Agent Workflow

1. `dbcli --status`
2. `dbcli connect <db-name>` or `dbcli connect "<url>"`
3. `dbcli list`
4. `dbcli pull`
5. `dbcli describe` (baseline context)
6. `dbcli schema <table>` + `dbcli related <table>` (before complex SQL)
7. Draft/update descriptions, then `dbcli import --file <path>` or `dbcli import '<json>'`
8. `dbcli query "<sql>"`

## 5) Manual Skill Command: `/dbcli-describe`

After installing/exporting skills, agents can use `/dbcli-describe` to produce high-quality description drafts.

Recommended behavior for `/dbcli-describe`:

1. Run `dbcli list` to collect active tables.
2. Run `dbcli list <table>` for key tables.
3. Run `dbcli related <table>` where relationships clarify business meaning.
4. Draft:
   - `database`: 1-3 concise business-level sentences.
   - `tables`: one concise business-level sentence per table.
5. Return JSON compatible with `dbcli import`.
6. Ask for explicit user confirmation before importing.
7. Import only after confirmation.

Writing style rules:

- Keep descriptions short and business-oriented.
- Avoid speculative details if confidence is low.
- Do not auto-import without explicit user confirmation.

## 6) Local Storage (Sanitized Examples)

`dbcli` local data is stored under `~/.dbcli`.

### 6.1 Connections store (`~/.dbcli/connections.json`)

```json
{
  "current": "prod_analytics",
  "connections": {
    "prod_analytics": {
      "url": "postgresql://db.example.com:5432/prod_analytics",
      "database": "prod_analytics",
      "host": "db.example.com",
      "port": 5432,
      "username": "<DB_USERNAME>",
      "password": "<DB_PASSWORD>",
      "lastConnected": "2026-05-07T12:46:35.731Z"
    },
    "staging_orders": {
      "url": "postgresql://staging-db.example.com:5432/staging_orders",
      "database": "staging_orders",
      "host": "staging-db.example.com",
      "port": 5432,
      "username": "<DB_USERNAME>",
      "password": "<DB_PASSWORD>",
      "lastConnected": "2026-05-07T12:46:55.862Z"
    }
  }
}
```

Sanitization notes:

- Never publish real hosts, usernames, or passwords.
- Replace credentials with placeholders such as `<DB_USERNAME>` and `<DB_PASSWORD>`.
- Replace internal hostnames/IPs with example domains.

### 6.2 Description store (`~/.dbcli/descriptions/<connection>.json`)

```json
{
  "version": 1,
  "database": "This database supports the core order workflow for users, orders, and payments.",
  "tables": {
    "conversations": "User-facing conversation records for support and assistant interactions.",
    "test_table": "Temporary validation table used for integration checks.",
    "users": "User accounts and profile information."
  },
  "removed_tables": {
    "legacy_test": "Legacy test table preserved for historical context."
  }
}
```

## 7) Development Intent Summary

This project is designed for an agent-first database workflow:

- First, understand structure (`list`, `schema`, `related`).
- Then, maintain semantic context (`pull`, `describe`, `import`).
- Finally, execute SQL with better context quality (`query`).

The expected long-term value is safer SQL generation, faster schema onboarding, and more reliable agent behavior on real production-like databases.
