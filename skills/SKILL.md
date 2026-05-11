---
name: dbcli
description: Use this skill when the user needs to inspect PostgreSQL tables, understand relationships, and execute SQL through dbcli.
---

# dbcli Skill

Use this skill to inspect PostgreSQL schema, understand table relationships, and run SQL through `dbcli`.

## Use This Skill When

- The user asks to inspect database tables/columns.
- The user wants database or table descriptions for agent context.
- The user needs related tables before writing joins.
- The user wants SQL execution through a saved database connection.

## Constraints

- Database support is PostgreSQL only.
- Most commands run against the current connection and do not take `<db-name>`.
- Validate table structure and relationships before running write SQL.

## Workflow

1. Check connections: `dbcli --status`
2. Set current connection:
   - Create/update: `dbcli connect "postgresql://user:password@host:5432/database"`
   - Switch existing: `dbcli connect <db-name>`
3. Discover schema context:
   - `dbcli list`
   - `dbcli list <table>`
   - `dbcli pull`
   - `dbcli describe`
   - `dbcli describe <table>`
   - `dbcli import --file <path>`
   - `dbcli import '<json>'`
   - `dbcli schema <table>`
   - `dbcli related <table>`
4. Execute SQL: `dbcli query "<sql>"`
5. Export the full skill bundle when needed:
   - `dbcli skill --output <path>`
   - exported folder: `<path>/dbcli-skills`

## Manual Command

### `/dbcli-describe`

Use this when the user wants the agent to draft business-oriented database and table descriptions, then optionally write them back into dbcli.

Steps:

1. Run `dbcli list` to get the active tables.
2. For each table, inspect `dbcli list <table>`.
3. Use `dbcli related <table>` only when relationships help clarify the table's business role.
4. Draft short descriptions:
   - `database`: 1-3 sentences describing the database at a high level
   - `tables`: one short sentence per table
5. Return the draft as JSON compatible with `dbcli import`.
6. Ask for confirmation before importing anything.
7. Only after the user confirms, run `dbcli pull`.
8. Then run `dbcli import '<json>'` or `dbcli import --file <path>`.

Rules:

- Keep descriptions short and business-oriented.
- Do not turn table descriptions into long field-by-field explanations.
- Prefer high-confidence summaries based on table names, key columns, and obvious relationships.
- If meaning is unclear, use cautious wording instead of guessing.
- Do not import automatically without an explicit user confirmation.

## Rules

- Unknown table first: `dbcli list`
- Description file sync first: `dbcli pull`
- Batch description updates: `dbcli import --file <path>` or `dbcli import '<json>'`
- Join query first: `dbcli related <table>`
- Column-level checks: `dbcli list <table>`

## Reference

Detailed command semantics, suggested flow, and common errors:
`skills/references/quick-reference.md`
