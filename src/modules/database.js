const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'torn-hq.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS verified_users (
        discord_id TEXT PRIMARY KEY,
        torn_id TEXT NOT NULL UNIQUE,
        verified_at INTEGER NOT NULL
    )
`);

function getVerifiedUser(discordId) {
    return db
        .prepare(`
            SELECT *
            FROM verified_users
            WHERE discord_id = ?
        `)
        .get(discordId);
}

function getDiscordUserByTornId(tornId) {
    return db
        .prepare(`
            SELECT *
            FROM verified_users
            WHERE torn_id = ?
        `)
        .get(tornId);
}

function saveVerifiedUser(discordId, tornId) {
    const existingDiscord = getVerifiedUser(discordId);

    if (existingDiscord) {
        return {
            success: false,
            reason: 'discord_already_verified'
        };
    }

    const existingTorn = getDiscordUserByTornId(tornId);

    if (existingTorn) {
        return {
            success: false,
            reason: 'torn_account_already_linked'
        };
    }

    db.prepare(`
        INSERT INTO verified_users
        (discord_id, torn_id, verified_at)
        VALUES (?, ?, ?)
    `).run(
        discordId,
        tornId,
        Date.now()
    );

    return {
        success: true
    };
}

function isVerified(discordId) {
    return Boolean(getVerifiedUser(discordId));
}

module.exports = {
    getVerifiedUser,
    getDiscordUserByTornId,
    saveVerifiedUser,
    isVerified
};
