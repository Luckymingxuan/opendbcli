# opendbcli

A database CLI built for AI agents — not just humans.

You just provide your database connection, and the AI decides how to store, structure, and query data autonomously.

## Why opendbcli?

Tools like `psql` are built for humans managing databases.\
opendbcli is built for AI that needs to **own its data layer**.

- AI decides how to structure data
- AI decides what to store
- AI decides how to query

No abstractions. Just direct database control.\
opendbcli gives AI **full ownership of its data layer**, not just read/write access.

## Database Support

Currently supports **PostgreSQL only**.

This is a deliberate choice: focus on one solid foundation for AI-driven data systems.

## Quick Start

### Install

```bash
npm install -g @luckymingxuan/opendbcli
```

---

### Commands

Humans don't need to see what is shown to AI.

<img width="611" height="327" alt="Image" src="https://github.com/user-attachments/assets/0f9c3740-07c9-4165-ba11-3ebf547544f1" />


```bash
opendbcli connect my-db
opendbcli tables
opendbcli describe users
opendbcli query "SELECT * FROM users...."
```

### Example AI-driven Workflow

```bash
opendbcli query "CREATE TABLE notes (id SERIAL PRIMARY KEY, content TEXT)"
opendbcli query "INSERT INTO notes (content) VALUES ('hello world')"
opendbcli query "SELECT * FROM notes"
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
  "connections": {
    "my-db": {
      "url": "postgresql://user:pass@host:5432/db",
      "username": "user",
      "password": "pass",
      "connected": true
    }
  }
}
```

## License

MIT
