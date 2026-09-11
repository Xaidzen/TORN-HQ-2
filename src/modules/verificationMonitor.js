const db = require("./database");
const config = require("../utils/config");
const { decrypt } = require("./tornApi");

const TORN_API = "https://api.torn.com";
const CHECK_INTERVAL = 30 * 1000;

async function checkApiKey(apiKey) {
    try {
        const url =
            `${TORN_API}/user/?selections=basic&key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return {
                valid: false,
                code: Number(data.error.code),
                error: data.error.error
            };
        }

        return {
            valid: true
        };

    } catch (error) {
        console.error("[API MONITOR] Network error:", error);

        return {
            valid: null,
            error: "NETWORK_ERROR"
        };
    }
}

async function removeRolesAndUnverify(client, userRow) {
    const guild = await client.guilds.fetch(config.GUILD_ID);

    let member;

    try {
        member = await guild.members.fetch(userRow.discord_id);
    } catch {
        db.prepare(`
            DELETE FROM users
            WHERE discord_id = ?
        `).run(userRow.discord_id);

        return;
    }

    console.log(
        `[API MONITOR] Resetting roles for ${member.user.tag}`
    );

    for (const role of member.roles.cache.values()) {

        if (role.id === guild.id) continue;

        if (role.id === config.STAFF_ROLE_ID) continue;

        if (role.id === config.ADMIN_ROLE_ID) continue;

        if (!role.editable) {
            console.error(
                `[API MONITOR] Cannot remove "${role.name}". ` +
                `Move the bot role above this role.`
            );

            continue;
        }

        try {
            await member.roles.remove(
                role,
                "Torn API key is invalid, deleted, or paused."
            );

            console.log(
                `[API MONITOR] Removed "${role.name}" from ${member.user.tag}`
            );

        } catch (error) {
            console.error(
                `[API MONITOR] Failed to remove "${role.name}":`,
                error.message
            );
        }
    }

    const unverifiedRole =
        guild.roles.cache.get(config.UNVERIFIED_ROLE_ID);

    if (!unverifiedRole) {
        console.error(
            "[API MONITOR] Unverified role was not found."
        );
        return;
    }

    if (!unverifiedRole.editable) {
        console.error(
            "[API MONITOR] Bot cannot add the Unverified role. " +
            "Move the bot role above it."
        );
        return;
    }

    try {
        if (!member.roles.cache.has(config.UNVERIFIED_ROLE_ID)) {
            await member.roles.add(
                unverifiedRole,
                "Torn API key is invalid, deleted, or paused."
            );
        }

        console.log(
            `[API MONITOR] Added Unverified to ${member.user.tag}`
        );

    } catch (error) {
        console.error(
            "[API MONITOR] Failed to add Unverified:",
            error.message
        );

        return;
    }

    db.prepare(`
        DELETE FROM users
        WHERE discord_id = ?
    `).run(userRow.discord_id);

    console.log(
        `[API MONITOR] ${member.user.tag} is now unverified.`
    );
}

async function checkVerifiedUsers(client) {
    console.log(
        "[API MONITOR] Checking Torn API keys..."
    );

    const users = db.prepare(`
        SELECT
            discord_id,
            torn_id,
            torn_username,
            encrypted_api_key
        FROM users
    `).all();

    console.log(
        `[API MONITOR] Found ${users.length} account(s).`
    );

    for (const user of users) {
        try {
            const apiKey = decrypt(
                user.encrypted_api_key,
                config.ENCRYPTION_KEY
            );

            const result = await checkApiKey(apiKey);

            if (result.valid === true) {
                console.log(
                    `[API MONITOR] ${user.torn_username} [${user.torn_id}] is valid.`
                );

                continue;
            }

            if (result.valid === null) {
                console.log(
                    `[API MONITOR] Skipping ${user.torn_username} because of a network error.`
                );

                continue;
            }

            console.log(
                `[API MONITOR] ${user.torn_username} [${user.torn_id}] ` +
                `invalid. Error ${result.code}: ${result.error}`
            );

            await removeRolesAndUnverify(
                client,
                user
            );

        } catch (error) {
            console.error(
                `[API MONITOR] Error checking ${user.torn_username}:`,
                error
            );
        }
    }
}

function startVerificationMonitor(client) {
    checkVerifiedUsers(client);

    setInterval(() => {
        checkVerifiedUsers(client);
    }, CHECK_INTERVAL);

    console.log(
        "[API MONITOR] Started. Checking every 5 minutes."
    );
}

module.exports = {
    checkVerifiedUsers,
    startVerificationMonitor
};
