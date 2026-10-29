import sqlite3
import json
from datetime import datetime

DB_FILE = "portfolio_cache.db"

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. User Profile Cache Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            name TEXT,
            avatar_url TEXT,
            bio TEXT,
            followers INTEGER,
            total_stars INTEGER,
            top_languages TEXT,
            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Repository Metadata Cache Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS repositories (
            id INTEGER PRIMARY KEY,
            username TEXT,
            name TEXT,
            description TEXT,
            stars INTEGER,
            forks INTEGER,
            language TEXT,
            html_url TEXT,
            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()

def save_user_cache(username: str, profile_data: dict, repos_data: list):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT OR REPLACE INTO users (username, name, avatar_url, bio, followers, total_stars, top_languages, cached_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        username.lower(),
        profile_data.get("name"),
        profile_data.get("avatar_url"),
        profile_data.get("bio"),
        profile_data.get("followers", 0),
        profile_data.get("total_stars", 0),
        json.dumps(profile_data.get("top_languages", {})),
        datetime.utcnow()
    ))

    # Clear previous repos for this user to refresh
    cursor.execute("DELETE FROM repositories WHERE username = ?", (username.lower(),))

    for repo in repos_data:
        cursor.execute("""
            INSERT INTO repositories (id, username, name, description, stars, forks, language, html_url, cached_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            repo["id"],
            username.lower(),
            repo["name"],
            repo.get("description") or "No description provided.",
            repo.get("stargazers_count", 0),
            repo.get("forks_count", 0),
            repo.get("language") or "General",
            repo.get("html_url"),
            datetime.utcnow()
        ))

    conn.commit()
    conn.close()

def get_cached_user(username: str):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE username = ?", (username.lower(),))
    user_row = cursor.fetchone()
    
    if not user_row:
        conn.close()
        return None

    cursor.execute("SELECT * FROM repositories WHERE username = ? ORDER BY stars DESC", (username.lower(),))
    repo_rows = cursor.fetchall()
    conn.close()

    user = dict(user_row)
    user["top_languages"] = json.loads(user["top_languages"]) if user["top_languages"] else {}

    repos = [dict(r) for r in repo_rows]
    return {"profile": user, "repos": repos}