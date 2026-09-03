const config = require("../utils/config");

module.exports = {
    name: "messageCreate",

    async execute(message) {
        if (message.author.bot) {
            return;
        }

        if (
            message.channelId !==
            config.ENTER_VERIFICATION_CHANNEL_ID
        ) {
            return;
        }

        try {
            await message.delete();

            if (
                message.member &&
                message.member.moderatable
            ) {
                await message.member.timeout(
                    24 * 60 * 60 * 1000,
                    "Message sent in verification channel."
                );
            }

        } catch (error) {
            console.error(
                "Verification channel protection error:",
                error
            );
        }
    }
};
