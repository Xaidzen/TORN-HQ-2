const db = require("./database");
const config = require("../utils/config");
const {
    encrypt,
    verifyApiKey
} = require("./tornApi");

async function verifyUser(discordId, apiKey) {
    const result = await verifyApiKey(apiKey);

    if (!result.valid) {
        return {
            success: false,
            reason: result
        };
    }

    const existingTornAccount = db.prepare(`
        SELECT discord_id
        FROM users
        WHERE torn_id = ?
    `).get(result.tornId);

    if (
        existingTornAccount &&
        existingTornAccount.discord_id !== discordId
    ) {
        return {
            success: false,
            reason: {
                error: "TORN_ACCOUNT_ALREADY_LINKED"
            }
        };
    }

    const encryptedKey = encrypt(
        apiKey.trim(),
        config.ENCRYPTION_KEY
    );

    db.prepare(`
        INSERT INTO users (
            discord_id,
            torn_id,
            torn_username,
            encrypted_api_key,
            verification_time
        )
        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(discord_id)
        DO UPDATE SET
            torn_id = excluded.torn_id,
            torn_username = excluded.torn_username,
            encrypted_api_key = excluded.encrypted_api_key,
            verification_time = excluded.verification_time
    `).run(
        discordId,
        result.tornId,
        result.tornUsername,
        encryptedKey,
        Date.now()
    );

    return {
        success: true,
        tornId: result.tornId,
        tornUsername: result.tornUsername
    };
}

function getUser(discordId) {
    return db.prepare(`
        SELECT *
        FROM users
        WHERE discord_id = ?
    `).get(discordId);
}

function isVerified(discordId) {
    return Boolean(getUser(discordId));
}

module.exports = {
    verifyUser,
    getUser,
    isVerified
};
