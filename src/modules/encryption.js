const {
    encrypt,
    decrypt
} = require("../utils/encryption");

module.exports = {
    encryptApiKey(apiKey) {
        return encrypt(apiKey);
    },

    decryptApiKey(encryptedApiKey) {
        return decrypt(encryptedApiKey);
    }
};
