const db = require("./database");
const {
    decrypt,
    request
} = require("./tornApi");
const config = require("../utils/config");

async function getStoredApiKey(discordId) {
    const user = db.prepare(`
        SELECT encrypted_api_key
        FROM users
        WHERE discord_id = ?
    `).get(discordId);

    if (!user) {
        return null;
    }

    return decrypt(
        user.encrypted_api_key,
        config.ENCRYPTION_KEY
    );
}

/*
 * Payment detection is deliberately isolated here.
 *
 * The verification system is complete independently.
 * This function can use the required Torn log selection
 * once the exact payment log type used by the service
 * has been confirmed.
 */

async function checkPayment(discordId) {
    const apiKey = await getStoredApiKey(discordId);

    if (!apiKey) {
        return {
            success: false,
            reason: "NO_API_KEY"
        };
    }

    try {
        const data = await request(
            apiKey,
            "log"
        );

        if (data.error) {
            return {
                success: false,
                reason: data.error
            };
        }

        return {
            success: true,
            data
        };

    } catch (error) {
        return {
            success: false,
            reason: error.message
        };
    }
}

module.exports = {
    getStoredApiKey,
    checkPayment
};
