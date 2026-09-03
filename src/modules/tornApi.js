const crypto = require("crypto");

const BASE_URL = "https://api.torn.com";

function encrypt(text, secret) {
    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        key,
        iv
    );

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(value, secret) {
    const [ivHex, encrypted] = value.split(":");

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        key,
        Buffer.from(ivHex, "hex")
    );

    let decrypted = decipher.update(
        encrypted,
        "hex",
        "utf8"
    );

    decrypted += decipher.final("utf8");

    return decrypted;
}

async function request(apiKey, selection) {
    const url =
        `${BASE_URL}/user/?selections=${encodeURIComponent(selection)}` +
        `&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Torn API HTTP ${response.status}`
        );
    }

    return response.json();
}

async function verifyApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== "string") {
        return {
            valid: false,
            error: "EMPTY_KEY"
        };
    }

    const cleanKey = apiKey.trim();

    if (!/^[A-Za-z0-9]{16}$/.test(cleanKey)) {
        return {
            valid: false,
            error: "INVALID_FORMAT"
        };
    }

    try {
        const data = await request(
            cleanKey,
            "basic"
        );

        if (data.error) {
            return {
                valid: false,
                error: data.error.code,
                message: data.error.error
            };
        }

        if (!data.player_id) {
            return {
                valid: false,
                error: "NO_PLAYER_ID"
            };
        }

        return {
            valid: true,
            tornId: String(data.player_id),
            tornUsername: data.name || "Unknown"
        };

    } catch (error) {
        return {
            valid: false,
            error: "REQUEST_FAILED",
            message: error.message
        };
    }
}

module.exports = {
    encrypt,
    decrypt,
    verifyApiKey,
    request
};
