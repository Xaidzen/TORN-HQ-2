const {
    SlashCommandBuilder
} = require("discord.js");

const config = require("../utils/config");
const {
    orderEmbed,
    orderButtons
} = require("../utils/embeds");
const {
    isAdmin
} = require("../utils/permissions");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("order-panel")
        .setDescription("Create the Torn HQ order service panel."),

    async execute(interaction) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                content:
                    "You do not have permission to use this command.",
                ephemeral: true
            });
        }

        if (
            interaction.channelId !==
            config.ORDER_SERVICE_CHANNEL_ID
        ) {
            return interaction.reply({
                content:
                    "You can only use /order-panel in the #order-service channel.",
                ephemeral: true
            });
        }

        await interaction.channel.send({
            embeds: [orderEmbed()],
            components: [orderButtons()]
        });

        await interaction.reply({
            content: "Order service panel created.",
            ephemeral: true
        });
    }
};
