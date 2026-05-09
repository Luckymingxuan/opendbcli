# dbcli

A database CLI that truly opens your database to agents.

Give an agent a real database connection, and it can inspect schema, understand tables, and query the data layer directly.

## Why dbcli?

Tools like `psql` are built for humans managing databases.\
dbcli is built for agents that need to **understand and use a database as part of their workflow**.

- Agents can inspect tables and schema directly
- Agents can query the database without human-oriented wrappers
- Agents get closer to the real data layer instead of an abstracted API

The goal is simple: help agents understand the database, and make the database truly open to them.

## Database Support

Currently supports **PostgreSQL only**.

This is a deliberate choice: focus on one solid foundation for agent-native database workflows.

## Quick Start

### Install

```bash
npm install -g @luckymingxuan/dbcli
```

To make agent workflows more reliable, export the built-in skill file:

```bash
dbcli skill --output ./exports
```

Then place it in your agent skill directory, for example:

- Claude: `~/.claude/skills/dbcli/SKILL.md`
- Gemini: `~/.gemini/skills/dbcli/SKILL.md`
- Cursor: `.cursor/rules/dbcli.mdc`

---

### Commands

The CLI is designed for agent-readable database access.

<img width="679" height="339" alt="Image" src="https://github.com/user-attachments/assets/1ab2451f-f8f2-4558-85ce-d09726743a38" />


```bash
dbcli connect "postgresql://postgres:password@localhost:5432/mydb"
dbcli --status
dbcli list
dbcli list users
dbcli schema users
dbcli related users
dbcli query "SELECT * FROM users"
dbcli skill --output ./exports
dbcli disconnect
```

### Command Reference

```bash
dbcli connect "<postgresql-url>"      # Save and verify a database connection
dbcli --status                        # Show all saved connections
dbcli list                            # List all tables in the current database
dbcli list <table>                    # Show table columns in JSON without descriptions
dbcli schema <table>                  # Compact DDL-style schema output
dbcli related <table>                 # Related tables split by outgoing/incoming direction
dbcli query "<sql>"                   # Execute SQL on the current connection
dbcli skill --output <path>           # Export full skills bundle to <path>/dbcli-skills
dbcli disconnect [db-name]            # Remove a saved connection
```

### Skill Export

```bash
# Print skill markdown to stdout
dbcli skill

# Export full skills bundle to ./exports/dbcli-skills
dbcli skill --output ./exports
```

### Example AI-driven Workflow

```bash
dbcli connect "postgresql://postgres:password@localhost:5432/notesdb"
dbcli list
dbcli schema notes
dbcli related notes
dbcli query "CREATE TABLE notes (id SERIAL PRIMARY KEY, content TEXT)"
dbcli query "INSERT INTO notes (content) VALUES ('hello world')"
dbcli query "SELECT * FROM notes"
```

---

## Configuration

The connections are stored in:

```bash
~/.dbcli/connections.json
```

Example configuration:

```bash
{
  "mydb": {
    "url": "postgresql://localhost:5432/mydb",
    "database": "mydb",
    "host": "localhost",
    "port": 5432,
    "username": "postgres",
    "password": "password",
    "lastConnected": "2026-04-26T09:00:00.000Z"
  }
}
```

## License

MIT
