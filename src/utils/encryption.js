const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

// IMPORTANT:
// Set this in your .env file as ENCRYPTION_KEY.
// It must be a 64 character hexadecimal string.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    throw new Error(
        "ENCRYPTION_KEY is missing from your environment variables."
    );
}

if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
    throw new Error(
        "ENCRYPTION_KEY must be exactly 64 hexadecimal characters."
    );
}

const KEY = Buffer.from(ENCRYPTION_KEY, "hex");

function encrypt(text) {
    if (!text) {
        throw new Error("Nothing to encrypt.");
    }

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        KEY,
        iv
    );

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Store IV + auth tag + encrypted data together.
    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted
    ].join(":");
}

function decrypt(encryptedText) {
    if (!encryptedText) {
        throw new Error("Nothing to decrypt.");
    }

    const parts = encryptedText.split(":");

    if (parts.length !== 3) {
        throw new Error("Invalid encrypted API key format.");
    }

    const [ivHex, authTagHex, encrypted] = parts;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        KEY,
        iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
};
