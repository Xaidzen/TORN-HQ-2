const { Events } = require('discord.js');

const UNVERIFIED_ROLE_ID = process.env.UNVERIFIED_ROLE_ID;

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);

        client.on(Events.GuildMemberAdd, async (member) => {
            try {
                if (!UNVERIFIED_ROLE_ID) {
                    console.error('UNVERIFIED_ROLE_ID is missing from .env');
                    return;
                }

                await member.roles.add(UNVERIFIED_ROLE_ID);

                console.log(
                    `Added UNVERIFIED role to ${member.user.tag}`
                );

            } catch (error) {
                console.error(
                    `Failed to give UNVERIFIED role to ${member.user.tag}:`,
                    error
                );
            }
        });
    }
};
