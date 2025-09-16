# Setting up MCP Access to Supabase Database

## Option 1: Direct Database Connection (Recommended)

### 1. Get your Supabase Database Connection Details

From your Supabase dashboard:
- Go to **Settings** → **Database**
- Copy the **Connection string** (it looks like: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`)

### 2. Update your MCP configuration

Edit `/Users/siva/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:[YOUR-PASSWORD]@db.ticwxzgdbwvjbtnyqrop.supabase.co:5432/postgres"
      ],
      "env": {
        "PGPASSWORD": "[YOUR_PASSWORD]"
      }
    }
  }
}
```

### 3. Install the PostgreSQL MCP server

```bash
npm install -g @modelcontextprotocol/server-postgres
```

### 4. Restart Cursor

After updating the MCP configuration, restart Cursor to load the new MCP server.

## Option 2: Using Supabase CLI (Alternative)

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link your project

```bash
supabase link --project-ref [YOUR_PROJECT_REF]
```

### 4. Update MCP config for Supabase CLI

```json
{
  "mcpServers": {
    "supabase": {
      "command": "supabase",
      "args": ["db", "shell"],
      "cwd": "/Users/siva/Documents/GitHub/ideaflow/ideavibes"
    }
  }
}
```

## Option 3: Manual SQL Execution (Quick Fix)

If MCP setup is complex, you can:

1. **Run the debug script** in Supabase SQL Editor:
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste `debug-mod-admin-visibility.sql`
   - Run it to see the exact issue

2. **Run the fix script**:
   - Copy and paste `fix-idea-visibility-robust.sql`
   - Run it to fix the RLS policies

## Quick Test

Once MCP is set up, I'll be able to:
- Query your database directly
- See the exact RLS policies
- Check group memberships
- Verify idea visibility
- Fix issues in real-time

## Security Note

Make sure to:
- Use environment variables for passwords
- Don't commit database credentials to git
- Use read-only access when possible
