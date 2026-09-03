const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDirectory = path.join(__dirname, "../../data");

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
}

const db = new Database(
    path.join(dataDirectory, "torn-hq.sqlite")
);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        discord_id TEXT PRIMARY KEY,
        torn_id TEXT UNIQUE NOT NULL,
        torn_username TEXT NOT NULL,
        encrypted_api_key TEXT NOT NULL,
        verification_time INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
        ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT UNIQUE NOT NULL,
        owner_discord_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER,
        price INTEGER,
        claimer_discord_id TEXT,
        created_at INTEGER NOT NULL,
        claimed_at INTEGER,
        closed_at INTEGER,
        close_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        discord_id TEXT NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,

        FOREIGN KEY(ticket_id)
            REFERENCES tickets(ticket_id)
            ON DELETE CASCADE
    );
`);

module.exports = db;
