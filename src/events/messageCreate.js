const {
    Events
} = require('discord.js');

const VERIFICATION_CHANNEL_ID =
    process.env.VERIFICATION_CHANNEL_ID;

const ONE_DAY =
    24 * 60 * 60 * 1000;

console.log(
    'messageCreate.js loaded'
);

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {

        console.log(
            `Message detected: ${message.author.tag} in ${message.channelId}`
        );

        try {

            if (message.author.bot) {
                return;
            }

            if (!VERIFICATION_CHANNEL_ID) {

                console.error(
                    'VERIFICATION_CHANNEL_ID is missing from .env'
                );

                return;
            }

            if (
                message.channelId !==
                VERIFICATION_CHANNEL_ID
            ) {
                return;
            }

            console.log(
                `${message.author.tag} sent a message in the verification channel.`
            );

            await message.delete().catch(error => {

                console.error(
                    'Failed to delete message:',
                    error.message
                );

            });

            if (!message.member) {

                console.error(
                    'Could not find Discord member.'
                );

                return;
            }

            if (!message.member.moderatable) {

                console.error(
                    'Bot cannot timeout this member.'
                );

                return;
            }

            await message.member.timeout(
                ONE_DAY,
                'Sent a message in the verification channel instead of using /verify'
            );

            console.log(
                `${message.author.tag} was timed out for 1 day.`
            );

        } catch (error) {

            console.error(
                'Verification moderation error:',
                error
            );
        }
    }
};
