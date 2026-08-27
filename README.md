# 🛡️ Password Strength Analyzer + SQLite

A simple password strength analyzer and secure generator that automatically hashes and stores user credentials in a local **SQLite database** (`passwords.db`).

---

## 🏗️ How It Was Built

The application is built cleanly with zero unnecessary dependencies:

### 1. Frontend (UI & Logic)
- **`index.html`**: Structure for username/password inputs, real-time strength meter, and password generator.
- **`style.css`**: Clean, responsive interface with readable feedback and documentation sections.
- **`script.js`**: 
  - Real-time password scoring heuristic (0–100 score, character variety, pattern detection).
  - CSPRNG password generator using `crypto.getRandomValues()` that directly fills the password box.
  - Automatic debounced background saving to SQLite.

### 2. Backend & Security
- **`server.js`**: Lightweight server using Node.js built-in modules (`node:http`, `node:sqlite`, `node:crypto`). No extra npm packages required.
- **Hashing**: Every password is cryptographically secured with a unique **128-bit random salt** and hashed using **SHA-256** before saving. Plain text passwords are never stored.

### 3. Database
- **`passwords.db`**: Local SQLite database storing the `users` table (`id`, `username`, `password_hash`, `salt`, `strength_score`, `created_at`).

---

## 🚀 How to Start the Project

Open a terminal in the project root folder (`Andropedia_task1-main`). The project has two server options.

### Option A: Python (works without installing packages)

Python 3.7 or newer includes the required SQLite support:

```bash
python server.py
```

### Option B: Node.js

Install Node.js 22.5 or newer, then run:

```bash
npm start
```

The Node server uses the built-in `node:sqlite` module, so no `npm install` is needed. If Node or npm is reported as "not recognized", install Node.js and reopen VS Code so it is added to `PATH`.

### Open in browser

Visit **`http://localhost:3000`** in your browser.

To use another port, set the `PORT` environment variable before starting either server.

## 🎯 How to Use

1. **Enter Username**: Type any username (e.g. `alex_dev`).
2. **Enter Password**: 
   - Type a password to see instant live strength analysis, or
   - Click **"Generate password"** under Bonus Tools to generate a strong password directly into the input box.
3. **Automatic SQLite Storage**: Credentials are automatically hashed and saved to `passwords.db` with a `✓ Saved to SQLite` status.

---

## 🔍 How to View Data in "DB Browser for SQLite"

1. Open **DB Browser for SQLite**.
2. Click **Open Database** and select `passwords.db`.
3. Click the **Browse Data** tab at the top.
4. In the **`Table:`** dropdown at the top-left, select **`users`** (instead of `sqlite_sequence`).
5. You will see all stored usernames, salted SHA-256 hashes, scores, and timestamps!
