const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(
    path.join(dataDir, 'torn-hq.db')
);

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS verified_users (
        discord_id TEXT PRIMARY KEY,
        torn_id TEXT NOT NULL UNIQUE,
        verified_at INTEGER NOT NULL
    )
`);

function getVerifiedUser(discordId) {
    return db.prepare(`
        SELECT *
        FROM verified_users
        WHERE discord_id = ?
    `).get(discordId);
}

function getDiscordUserByTornId(tornId) {
    return db.prepare(`
        SELECT *
        FROM verified_users
        WHERE torn_id = ?
    `).get(String(tornId));
}

function isVerified(discordId) {
    return Boolean(getVerifiedUser(discordId));
}

function saveVerifiedUser(discordId, tornId) {
    tornId = String(tornId);

    const existingTorn = getDiscordUserByTornId(tornId);

    /*
     * One Torn account cannot be connected
     * to multiple Discord accounts.
     */
    if (
        existingTorn &&
        existingTorn.discord_id !== discordId
    ) {
        return {
            success: false,
            reason: 'torn_account_already_linked'
        };
    }

    const existingDiscord = getVerifiedUser(discordId);

    /*
     * Already connected to this Torn account.
     */
    if (
        existingDiscord &&
        existingDiscord.torn_id === tornId
    ) {
        db.prepare(`
            UPDATE verified_users
            SET verified_at = ?
            WHERE discord_id = ?
        `).run(
            Date.now(),
            discordId
        );

        return {
            success: true,
            updated: false
        };
    }

    /*
     * User is replacing their old Torn account
     * with a new valid account/key.
     */
    if (existingDiscord) {
        db.prepare(`
            UPDATE verified_users
            SET torn_id = ?, verified_at = ?
            WHERE discord_id = ?
        `).run(
            tornId,
            Date.now(),
            discordId
        );

        return {
            success: true,
            updated: true
        };
    }

    /*
     * First verification.
     */
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
        success: true,
        updated: true
    };
}

module.exports = {
    getVerifiedUser,
    getDiscordUserByTornId,
    isVerified,
    saveVerifiedUser
};
