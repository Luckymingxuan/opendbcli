<div align="center">
<pre>
██████╗ ██████╗  ██████╗██╗     ██╗
██╔══██╗██╔══██╗██╔════╝██║     ██║
██║  ██║██████╔╝██║     ██║     ██║
██║  ██║██╔══██╗██║     ██║     ██║
██████╔╝██████╔╝╚██████╗███████╗██║
╚═════╝ ╚═════╝  ╚═════╝╚══════╝╚═╝
</pre>
</div>

<div align="center">
<strong>An agent-native database CLI.</strong><br/>
Help agents understand real databases.
</div>

## Why dbcli?

Traditional database tools are built for humans.

dbcli is built for AI agents that need to understand and work with real databases.

Instead of hiding the database behind APIs and abstractions, dbcli gives agents direct access to the data layer.

The goal is simple: make databases understandable to agents.

## Quick Start

Currently focused on PostgreSQL.

### Install

```bash
npm install -g @luckymingxuan/dbcli
```

To help agents better understand and use your database, export the built-in skill bundle:

```bash
dbcli skill --output ./exports
```

You can install the exported skill manually, or ask your agent to place it into its own skill directory.

Common skill locations:

- Claude: `~/.claude/skills/dbcli/SKILL.md`
- Gemini: `~/.gemini/skills/dbcli/SKILL.md`
- Cursor: `.cursor/rules/dbcli.mdc`

---

## Example Agent Workflow

After installing the exported skill, ask your agent to run `/dbcli-describe` to draft descriptions, then confirm before importing them with `dbcli import`.

```bash
# Connect to the database
dbcli connect "postgresql://postgres:password@localhost:5432/notesdb"

# Inspect available tables
dbcli list

# Ask the agent to draft descriptions using the installed dbcli skill
/dbcli-describe
# Let the agent analyze the database and generate descriptions
dbcli pull
dbcli import '{"database":"Core notes application data","tables":{"notes":"User-created notes with text content and timestamps"}}'

# Understand schema and relationships
dbcli schema notes
dbcli related notes

# Query the database directly
dbcli query "SELECT * FROM notes"
```

---

## Configuration

The connections are stored in:

```bash
~/.dbcli/connections.json
```

Descriptions are stored in:

```bash
~/.dbcli/descriptions/<connection-name>.json
```

Removed tables are archived automatically when running:

```bash
dbcli pull
```

## License

MIT
