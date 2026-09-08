const { encrypt, decrypt } = require("./tornApi");
const config = require("../utils/config");

function encryptApiKey(apiKey) {
    return encrypt(apiKey, config.ENCRYPTION_KEY);
}

function decryptApiKey(encryptedApiKey) {
    return decrypt(encryptedApiKey, config.ENCRYPTION_KEY);
}

module.exports = {
    encryptApiKey,
    decryptApiKey
};
