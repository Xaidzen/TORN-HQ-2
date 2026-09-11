const {
    startVerificationMonitor
} = require("../modules/verificationMonitor");

module.exports = {
    name: "clientReady",
    once: true,

    async execute(client) {
        console.log(
            `[READY] Logged in as ${client.user.tag}`
        );

        startVerificationMonitor(client);
    }
};
