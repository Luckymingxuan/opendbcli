---
name: dbcli
description: Use this skill when the user needs to inspect PostgreSQL tables, understand relationships, and execute SQL through dbcli.
---

# dbcli Skill

Use this skill to inspect PostgreSQL schema, understand table relationships, and run SQL through `dbcli`.

## Use This Skill When

- The user asks to inspect database tables/columns.
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
   - `dbcli tables`
   - `dbcli schema <table>`
   - `dbcli describe <table>`
   - `dbcli related <table>`
4. Execute SQL: `dbcli query "<sql>"`
5. Export the full skill bundle when needed:
   - `dbcli skill --output <path>`
   - exported folder: `<path>/dbcli-skills`

## Rules

- Unknown table first: `dbcli tables`
- Join query first: `dbcli related <table>`
- Column-level checks: `dbcli describe <table>`

## Reference

Detailed command semantics, suggested flow, and common errors:
`skills/references/quick-reference.md`
