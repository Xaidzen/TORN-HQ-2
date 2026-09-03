const crypto = require("crypto");

const TORN_API = "https://api.torn.com";

function encrypt(text, secret) {
    const iv = crypto.randomBytes(16);

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    return (
        iv.toString("hex") +
        ":" +
        encrypted.toString("hex")
    );
}

function decrypt(data, secret) {
    const [ivHex, encryptedHex] =
        data.split(":");

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        key,
        Buffer.from(ivHex, "hex")
    );

    return Buffer.concat([
        decipher.update(
            Buffer.from(
                encryptedHex,
                "hex"
            )
        ),
        decipher.final()
    ]).toString("utf8");
}

async function tornRequest(
    apiKey,
    selection,
    id = null
) {
    const url =
        id
            ? `${TORN_API}/user/${id}/?selections=${selection}&key=${encodeURIComponent(apiKey)}`
            : `${TORN_API}/user/?selections=${selection}&key=${encodeURIComponent(apiKey)}`;

    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Torn API HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    if (data.error) {
        throw new Error(
            `Torn API ${data.error.code}: ${data.error.error}`
        );
    }

    return data;
}

async function verifyApiKey(apiKey) {
    try {
        const data =
            await tornRequest(
                apiKey.trim(),
                "basic"
            );

        if (
            !data.player_id ||
            !data.name
        ) {
            return {
                valid: false,
                error: "INVALID_KEY"
            };
        }

        return {
            valid: true,
            tornId: String(
                data.player_id
            ),
            tornUsername: data.name
        };

    } catch {
        return {
            valid: false,
            error: "INVALID_KEY"
        };
    }
}

async function getTornUser(
    apiKey,
    tornId
) {
    const basic =
        await tornRequest(
            apiKey,
            "basic",
            tornId
        );

    const profile =
        await tornRequest(
            apiKey,
            "profile",
            tornId
        ).catch(() => null);

    const faction =
        await tornRequest(
            apiKey,
            "faction",
            tornId
        ).catch(() => null);

    const factionName =
        faction?.faction?.name ||
        faction?.name ||
        "N/A";

    const life =
        profile?.life ||
        basic?.life ||
        null;

    const status =
        profile?.status ||
        basic?.status ||
        null;

    let statusText = "Offline";

    if (
        typeof status === "object" &&
        status !== null
    ) {
        statusText =
            status.state ||
            "Offline";
    } else if (
        Array.isArray(status)
    ) {
        statusText =
            status[0] ||
            "Offline";
    } else if (
        typeof status === "string"
    ) {
        statusText =
            status;
    }

    const profilePicture =
        profile?.profile_image ||
        profile?.profile_image_url ||
        profile?.image ||
        null;

    return {
        id: String(
            basic?.player_id ||
            profile?.player_id ||
            tornId
        ),

        username:
            basic?.name ||
            profile?.name ||
            "Unknown",

        profileLink:
            `https://www.torn.com/profiles.php?XID=${tornId}`,

        profilePicture,

        status: statusText,

        faction: factionName,

        lifeCurrent:
            life?.current ??
            life?.now ??
            "N/A",

        lifeMaximum:
            life?.maximum ??
            life?.max ??
            "N/A"
    };
}

module.exports = {
    encrypt,
    decrypt,
    verifyApiKey,
    getTornUser
};
