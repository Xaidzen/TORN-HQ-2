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

    CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        type TEXT NOT NULL,
        channel_id TEXT,
        target_id TEXT NOT NULL,
        target_name TEXT,
        total_amount INTEGER NOT NULL,
        available_amount INTEGER NOT NULL,
        payout INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_id INTEGER NOT NULL,
        guild_id TEXT NOT NULL,
        discord_id TEXT NOT NULL,
        torn_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        amount_claimed INTEGER NOT NULL,
        amount_completed INTEGER NOT NULL DEFAULT 0,
        payout INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        deadline INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',

        FOREIGN KEY(contract_id)
            REFERENCES contracts(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS claim_attacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id INTEGER NOT NULL,
        attack_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,

        UNIQUE(claim_id, attack_id),

        FOREIGN KEY(claim_id)
            REFERENCES claims(id)
            ON DELETE CASCADE
    );
`);

module.exports = db;
