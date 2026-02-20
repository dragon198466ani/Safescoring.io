#!/usr/bin/env python3
"""
SafeScoring Supabase MCP Server
===============================
Model Context Protocol server for executing SQL queries on Supabase.

Usage:
    python mcp/supabase_server.py

Configure in Claude Code settings:
    "mcpServers": {
        "supabase": {
            "command": "python",
            "args": ["c:/Users/alexa/Desktop/SafeScoring/mcp/supabase_server.py"]
        }
    }
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from typing import Any

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def load_env(filepath: Path) -> dict:
    """Load .env file."""
    env_vars = {}
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars


# Load environment variables
env = {}
env.update(load_env(project_root / '.env'))
env.update(load_env(project_root / 'config' / '.env'))

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_KEY')

# MCP Protocol Implementation
class MCPServer:
    def __init__(self):
        self.name = "supabase"
        self.version = "1.0.0"

    async def handle_request(self, request: dict) -> dict:
        """Handle incoming MCP request."""
        method = request.get("method", "")
        params = request.get("params", {})
        request_id = request.get("id")

        try:
            if method == "initialize":
                return self.initialize(request_id)
            elif method == "tools/list":
                return self.list_tools(request_id)
            elif method == "tools/call":
                return await self.call_tool(request_id, params)
            elif method == "resources/list":
                return self.list_resources(request_id)
            elif method == "resources/read":
                return await self.read_resource(request_id, params)
            else:
                return self.error_response(request_id, -32601, f"Method not found: {method}")
        except Exception as e:
            return self.error_response(request_id, -32603, str(e))

    def initialize(self, request_id: Any) -> dict:
        """Handle initialize request."""
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {},
                    "resources": {}
                },
                "serverInfo": {
                    "name": self.name,
                    "version": self.version
                }
            }
        }

    def list_tools(self, request_id: Any) -> dict:
        """List available tools."""
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": [
                    {
                        "name": "execute_sql",
                        "description": "Execute a SQL query on Supabase database. Use for DDL (CREATE, ALTER) and DML (SELECT, INSERT, UPDATE, DELETE) operations.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The SQL query to execute"
                                }
                            },
                            "required": ["query"]
                        }
                    },
                    {
                        "name": "list_tables",
                        "description": "List all tables in the public schema",
                        "inputSchema": {
                            "type": "object",
                            "properties": {}
                        }
                    },
                    {
                        "name": "describe_table",
                        "description": "Get the schema/columns of a table",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "table_name": {
                                    "type": "string",
                                    "description": "Name of the table to describe"
                                }
                            },
                            "required": ["table_name"]
                        }
                    },
                    {
                        "name": "insert_data",
                        "description": "Insert data into a table",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "table": {
                                    "type": "string",
                                    "description": "Table name"
                                },
                                "data": {
                                    "type": "object",
                                    "description": "Data to insert (key-value pairs)"
                                }
                            },
                            "required": ["table", "data"]
                        }
                    },
                    {
                        "name": "select_data",
                        "description": "Select data from a table with optional filters",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "table": {
                                    "type": "string",
                                    "description": "Table name"
                                },
                                "columns": {
                                    "type": "string",
                                    "description": "Columns to select (comma-separated, or * for all)"
                                },
                                "filters": {
                                    "type": "object",
                                    "description": "Filter conditions (key-value pairs for equality)"
                                },
                                "limit": {
                                    "type": "integer",
                                    "description": "Maximum number of rows to return"
                                }
                            },
                            "required": ["table"]
                        }
                    }
                ]
            }
        }

    def list_resources(self, request_id: Any) -> dict:
        """List available resources."""
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "resources": [
                    {
                        "uri": "supabase://tables",
                        "name": "Database Tables",
                        "description": "List of all tables in the Supabase database",
                        "mimeType": "application/json"
                    },
                    {
                        "uri": "supabase://config",
                        "name": "Supabase Configuration",
                        "description": "Current Supabase connection info",
                        "mimeType": "application/json"
                    }
                ]
            }
        }

    async def read_resource(self, request_id: Any, params: dict) -> dict:
        """Read a resource."""
        uri = params.get("uri", "")

        if uri == "supabase://tables":
            tables = await self._list_tables()
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "contents": [
                        {
                            "uri": uri,
                            "mimeType": "application/json",
                            "text": json.dumps(tables, indent=2)
                        }
                    ]
                }
            }
        elif uri == "supabase://config":
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "contents": [
                        {
                            "uri": uri,
                            "mimeType": "application/json",
                            "text": json.dumps({
                                "url": SUPABASE_URL[:50] + "..." if SUPABASE_URL else None,
                                "configured": bool(SUPABASE_URL and SUPABASE_KEY)
                            }, indent=2)
                        }
                    ]
                }
            }
        else:
            return self.error_response(request_id, -32602, f"Unknown resource: {uri}")

    async def call_tool(self, request_id: Any, params: dict) -> dict:
        """Call a tool."""
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        if tool_name == "execute_sql":
            result = await self._execute_sql(arguments.get("query", ""))
        elif tool_name == "list_tables":
            result = await self._list_tables()
        elif tool_name == "describe_table":
            result = await self._describe_table(arguments.get("table_name", ""))
        elif tool_name == "insert_data":
            result = await self._insert_data(arguments.get("table", ""), arguments.get("data", {}))
        elif tool_name == "select_data":
            result = await self._select_data(
                arguments.get("table", ""),
                arguments.get("columns", "*"),
                arguments.get("filters", {}),
                arguments.get("limit", 100)
            )
        else:
            return self.error_response(request_id, -32602, f"Unknown tool: {tool_name}")

        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, indent=2, default=str)
                    }
                ]
            }
        }

    async def _execute_sql(self, query: str) -> dict:
        """Execute SQL query via Supabase REST API."""
        import requests

        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"error": "Supabase not configured"}

        # Use the RPC endpoint for executing SQL
        url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
        }

        try:
            response = requests.post(url, json={'query': query}, headers=headers, timeout=30)

            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            elif response.status_code == 404:
                # exec_sql function doesn't exist, try alternative approach
                return await self._execute_sql_alternative(query)
            else:
                return {"error": f"HTTP {response.status_code}", "details": response.text[:500]}
        except Exception as e:
            return {"error": str(e)}

    async def _execute_sql_alternative(self, query: str) -> dict:
        """Alternative SQL execution for DDL statements."""
        import requests

        # For DDL statements, we need to use the management API or provide instructions
        query_lower = query.strip().lower()

        if query_lower.startswith(('create', 'alter', 'drop')):
            return {
                "warning": "DDL statements require the Supabase SQL Editor",
                "instruction": "Please run this SQL in the Supabase Dashboard > SQL Editor",
                "query_preview": query[:500]
            }
        elif query_lower.startswith('select'):
            # Try to parse and use REST API for SELECT
            return {"error": "Use select_data tool for SELECT queries, or run in SQL Editor"}
        elif query_lower.startswith('insert'):
            return {"error": "Use insert_data tool for INSERT operations"}
        else:
            return {"error": "This SQL operation requires the Supabase SQL Editor"}

    async def _list_tables(self) -> list:
        """List all tables using REST API."""
        import requests

        if not SUPABASE_URL or not SUPABASE_KEY:
            return [{"error": "Supabase not configured"}]

        # Query information_schema via RPC or use a known tables list
        url = f"{SUPABASE_URL}/rest/v1/"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
        }

        try:
            # Get OpenAPI spec which lists all tables
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                # Parse the response to get table names
                # The root endpoint returns available endpoints
                return {"tables": "Use Supabase Dashboard to see all tables, or query specific tables with select_data"}
            else:
                return {"error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}

    async def _describe_table(self, table_name: str) -> dict:
        """Describe a table's columns."""
        import requests

        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"error": "Supabase not configured"}

        # Try to get one row to see column structure
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?limit=0"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Prefer': 'count=exact'
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                count = response.headers.get('content-range', 'unknown')
                return {
                    "table": table_name,
                    "row_count": count,
                    "note": "Query the table with select_data to see column structure"
                }
            else:
                return {"error": f"Table not found or not accessible: {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}

    async def _insert_data(self, table: str, data: dict) -> dict:
        """Insert data into a table."""
        import requests

        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"error": "Supabase not configured"}

        url = f"{SUPABASE_URL}/rest/v1/{table}"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

        try:
            response = requests.post(url, json=data, headers=headers, timeout=30)
            if response.status_code in [200, 201]:
                return {"success": True, "data": response.json()}
            else:
                return {"error": f"HTTP {response.status_code}", "details": response.text[:500]}
        except Exception as e:
            return {"error": str(e)}

    async def _select_data(self, table: str, columns: str = "*", filters: dict = None, limit: int = 100) -> dict:
        """Select data from a table."""
        import requests

        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"error": "Supabase not configured"}

        url = f"{SUPABASE_URL}/rest/v1/{table}?select={columns}&limit={limit}"

        # Add filters
        if filters:
            for key, value in filters.items():
                url += f"&{key}=eq.{value}"

        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
        }

        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "count": len(data), "data": data}
            else:
                return {"error": f"HTTP {response.status_code}", "details": response.text[:500]}
        except Exception as e:
            return {"error": str(e)}

    def error_response(self, request_id: Any, code: int, message: str) -> dict:
        """Create an error response."""
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": code,
                "message": message
            }
        }


async def main():
    """Main entry point for MCP server."""
    server = MCPServer()

    # Read from stdin, write to stdout (MCP protocol)
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line)
            response = await server.handle_request(request)

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()

        except json.JSONDecodeError:
            continue
        except KeyboardInterrupt:
            break
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    # Check if running in test mode
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("Supabase MCP Server - Test Mode")
        print(f"Supabase URL: {SUPABASE_URL[:50] if SUPABASE_URL else 'NOT SET'}...")
        print(f"Supabase Key: {'SET' if SUPABASE_KEY else 'NOT SET'}")
        print("\nAvailable tools:")
        print("  - execute_sql: Execute SQL queries")
        print("  - list_tables: List database tables")
        print("  - describe_table: Get table schema")
        print("  - insert_data: Insert data into table")
        print("  - select_data: Select data from table")
    else:
        asyncio.run(main())
