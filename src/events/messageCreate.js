const {
    Events
} = require('discord.js');

const VERIFICATION_CHANNEL_ID =
    process.env.VERIFICATION_CHANNEL_ID;

const ONE_DAY =
    24 * 60 * 60 * 1000;

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {

        try {

            if (message.author.bot) {
                return;
            }

            if (
                !VERIFICATION_CHANNEL_ID ||
                message.channelId !==
                VERIFICATION_CHANNEL_ID
            ) {
                return;
            }

            await message.delete().catch(() => {});

            if (
                !message.member ||
                !message.member.moderatable
            ) {
                console.error(
                    `Cannot timeout ${message.author.tag}`
                );

                return;
            }

            await message.member.timeout(
                ONE_DAY,
                'Sent a message in the verification channel instead of using /verify'
            );

            console.log(
                `${message.author.tag} was timed out for 1 day in the verification channel.`
            );

        } catch (error) {

            console.error(
                'Verification channel moderation error:',
                error
            );
        }
    }
};
