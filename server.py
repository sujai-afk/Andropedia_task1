#!/usr/bin/env python3
import http.server
import socketserver
import json
import sqlite3
import hashlib
import secrets
import os
import mimetypes

PORT = int(os.environ.get("PORT", "3000"))
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "passwords.db")
APP_DIR = os.path.dirname(os.path.abspath(__file__))

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            algorithm TEXT NOT NULL DEFAULT 'SHA-256 (Salted)',
            strength_score INTEGER DEFAULT 0,
            strength_label TEXT DEFAULT 'UNKNOWN',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

init_db()

class AppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/save-password":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8") or "{}")
                username = str(data.get("username", "")).strip()
                password = str(data.get("password", ""))
                score = data.get("score", 0)
                label = data.get("label", "UNKNOWN")

                if not username:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Username is required"}).encode("utf-8"))
                    return

                if not password:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Password is required"}).encode("utf-8"))
                    return

                salt = secrets.token_hex(16)
                password_hash = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
                algorithm = "SHA-256 (Salted)"

                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username,))
                row = cursor.fetchone()

                if row:
                    record_id = row[0]
                    cursor.execute("""
                        UPDATE users 
                        SET password_hash = ?, salt = ?, algorithm = ?, strength_score = ?, strength_label = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (password_hash, salt, algorithm, score, label, record_id))
                else:
                    cursor.execute("""
                        INSERT INTO users (username, password_hash, salt, algorithm, strength_score, strength_label)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (username, password_hash, salt, algorithm, score, label))
                    record_id = cursor.lastrowid

                conn.commit()
                conn.close()

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                response_data = {
                    "success": True,
                    "id": record_id,
                    "username": username,
                    "password_hash": password_hash,
                    "salt": salt,
                    "algorithm": algorithm,
                    "strength_score": score,
                    "strength_label": label,
                    "message": "Password hashed and saved to SQLite successfully."
                }
                self.wfile.write(json.dumps(response_data).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/records":
            try:
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, username, password_hash, salt, algorithm, strength_score, strength_label, created_at, updated_at
                    FROM users ORDER BY updated_at DESC
                """)
                rows = cursor.fetchall()
                conn.close()

                records = []
                for r in rows:
                    records.append({
                        "id": r[0],
                        "username": r[1],
                        "password_hash": r[2],
                        "salt": r[3],
                        "algorithm": r[4],
                        "strength_score": r[5],
                        "strength_label": r[6],
                        "created_at": r[7],
                        "updated_at": r[8]
                    })

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "count": len(records), "records": records}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        super().do_GET()

if __name__ == "__main__":
    print("=================================================")
    print("  ANDROPEDIA · PASSWORD STRENGTH ANALYZER + SQLITE (Python)")
    print(f"  Server running at: http://localhost:{PORT}")
    print(f"  Database file:     {DB_FILE}")
    print("  Compatible with:   DB Browser for SQLite")
    print("=================================================")
    with socketserver.TCPServer(("", PORT), AppHandler) as httpd:
        httpd.serve_forever()
