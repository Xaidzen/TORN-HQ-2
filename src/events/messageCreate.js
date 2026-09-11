const config = require("../utils/config");

const {
    getTicketByChannel,
    saveMessage
} = require("../modules/ticketSystem");

module.exports = {
    name: "messageCreate",

    async execute(message) {
        if (message.author.bot) {
            return;
        }

        /*
         * =========================
         * TICKET MESSAGE LOGGING
         * =========================
         */

        try {
            const ticket =
                getTicketByChannel(message.channelId);

            if (ticket && !ticket.closed_at) {
                const content =
                    message.content?.trim();

                if (content) {
                    saveMessage(
                        ticket.ticket_id,
                        message.author.id,
                        message.author.username,
                        content
                    );
                }
            }
        } catch (error) {
            console.error(
                "Ticket message logging error:",
                error
            );
        }

        /*
         * =========================
         * VERIFICATION CHANNEL
         * =========================
         */

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
