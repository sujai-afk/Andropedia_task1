const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'passwords.db');

// Initialize SQLite database
const db = new DatabaseSync(DB_FILE);

// Create table if it doesn't exist
db.exec(`
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
`);

console.log(`[SQLite] Database initialized at: ${DB_FILE}`);

// Helper: Hash password with salt
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Save / Update User Password
  if (req.method === 'POST' && pathname === '/api/save-password') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const username = (data.username || '').trim();
        const password = data.password || '';
        const strengthScore = typeof data.score === 'number' ? data.score : 0;
        const strengthLabel = data.label || 'UNKNOWN';

        if (!username) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Username is required' }));
          return;
        }

        if (!password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Password is required' }));
          return;
        }

        // Generate cryptographically secure salt and hash
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(password, salt);
        const algorithm = 'SHA-256 (Salted)';

        // Check if user already exists
        const checkUserStmt = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE');
        const existing = checkUserStmt.all(username);

        let recordId;
        if (existing.length > 0) {
          recordId = existing[0].id;
          const updateStmt = db.prepare(`
            UPDATE users 
            SET password_hash = ?, salt = ?, algorithm = ?, strength_score = ?, strength_label = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `);
          updateStmt.run(passwordHash, salt, algorithm, strengthScore, strengthLabel, recordId);
        } else {
          const insertStmt = db.prepare(`
            INSERT INTO users (username, password_hash, salt, algorithm, strength_score, strength_label)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          const result = insertStmt.run(username, passwordHash, salt, algorithm, strengthScore, strengthLabel);
          recordId = result.lastInsertRowid;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          id: recordId,
          username,
          password_hash: passwordHash,
          salt,
          algorithm,
          strength_score: strengthScore,
          strength_label: strengthLabel,
          message: 'Password hashed and saved to SQLite successfully.'
        }));
      } catch (err) {
        console.error('[API Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error processing request', details: err.message }));
      }
    });
    return;
  }

  // API: Get Stored Records (Hashed passwords only)
  if (req.method === 'GET' && pathname === '/api/records') {
    try {
      const stmt = db.prepare(`
        SELECT id, username, password_hash, salt, algorithm, strength_score, strength_label, created_at, updated_at
        FROM users
        ORDER BY updated_at DESC
      `);
      const records = stmt.all();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: records.length, records }));
    } catch (err) {
      console.error('[API Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to retrieve records' }));
    }
    return;
  }

  // Static File Serving
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, path.normalize(safePath).replace(/^(\.\.[\/\\])+/, ''));

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  ANDROPEDIA · PASSWORD STRENGTH ANALYZER + SQLITE`);
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  Database file:     ${DB_FILE}`);
  console.log(`  Compatible with:   DB Browser for SQLite`);
  console.log(`=================================================`);
});
