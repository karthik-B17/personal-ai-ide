import sqlite3
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "chat_history.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    # sessions table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # messages table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content TEXT,
            tool_calls TEXT,  -- JSON array
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
    ''')
    # api_keys table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS api_keys (
            provider TEXT PRIMARY KEY,
            api_key TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ----- Session & Message functions (unchanged) -----
def create_session(title="New Chat"):
    sid = str(uuid.uuid4())
    conn = get_db()
    conn.execute("INSERT INTO sessions (id, title) VALUES (?, ?)", (sid, title))
    conn.commit()
    conn.close()
    return sid

def get_sessions():
    conn = get_db()
    rows = conn.execute("SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_session(session_id):
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()

def update_session_title(session_id, title):
    conn = get_db()
    conn.execute("UPDATE sessions SET title = ? WHERE id = ?", (title, session_id))
    conn.commit()
    conn.close()

def add_message(session_id, role, content, tool_calls=None):
    conn = get_db()
    tool_calls_json = json.dumps(tool_calls) if tool_calls else None
    conn.execute(
        "INSERT INTO messages (session_id, role, content, tool_calls) VALUES (?, ?, ?, ?)",
        (session_id, role, content, tool_calls_json)
    )
    conn.execute("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()

def get_messages(session_id):
    conn = get_db()
    rows = conn.execute(
        "SELECT role, content, tool_calls FROM messages WHERE session_id = ? ORDER BY created_at",
        (session_id,)
    ).fetchall()
    conn.close()
    messages = []
    for row in rows:
        msg = {"role": row["role"], "content": row["content"]}
        if row["tool_calls"]:
            msg["tool_calls"] = json.loads(row["tool_calls"])
        messages.append(msg)
    return messages

# ----- API Key functions (new) -----
def get_api_key(provider: str) -> Optional[str]:
    conn = get_db()
    row = conn.execute("SELECT api_key FROM api_keys WHERE provider = ?", (provider,)).fetchone()
    conn.close()
    return row["api_key"] if row else None

def set_api_key(provider: str, api_key: str):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO api_keys (provider, api_key, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        (provider, api_key)
    )
    conn.commit()
    conn.close()

def delete_api_key(provider: str):
    conn = get_db()
    conn.execute("DELETE FROM api_keys WHERE provider = ?", (provider,))
    conn.commit()
    conn.close()

def get_all_api_keys() -> dict:
    conn = get_db()
    rows = conn.execute("SELECT provider, api_key FROM api_keys").fetchall()
    conn.close()
    return {row["provider"]: row["api_key"] for row in rows}