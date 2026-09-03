const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require("discord.js");

const config = require("../utils/config");

const {
    verifyUser,
    getUser,
    isVerified
} = require("../modules/verification");

const {
    decrypt,
    getTornUser
} = require("../modules/tornApi");

const {
    giveServiceRole
} = require("../modules/serviceRoles");

const {
    createLossTicket,
    getTicket,
    getTicketByChannel,
    claimTicket,
    closeTicket,
    saveMessage
} = require("../modules/ticketSystem");

const {
    isStaff
} = require("../utils/permissions");

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        try {

            /*
             * SLASH COMMANDS
             */

            if (interaction.isChatInputCommand()) {
                const command =
                    interaction.client.commands.get(
                        interaction.commandName
                    );

                if (!command) return;

                await command.execute(interaction);
                return;
            }


            /*
             * ADD / UPDATE API KEY
             */

            if (
                interaction.isButton() &&
                interaction.customId === "verify_add_key"
            ) {
                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            "verify_api_key_modal"
                        )
                        .setTitle(
                            "Add / Update Torn API Key"
                        );

                const keyInput =
                    new TextInputBuilder()
                        .setCustomId("api_key")
                        .setLabel(
                            "⚠️ Do not add your personal information."
                        )
                        .setPlaceholder(
                            "Enter your 16 Character Torn API Key"
                        )
                        .setStyle(
                            TextInputStyle.Short
                        )
                        .setRequired(true)
                        .setMinLength(16)
                        .setMaxLength(16);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        keyInput
                    )
                );

                await interaction.showModal(modal);
                return;
            }


            /*
             * API KEY MODAL
             */

            if (
                interaction.isModalSubmit() &&
                interaction.customId ===
                    "verify_api_key_modal"
            ) {
                const apiKey =
                    interaction.fields
                        .getTextInputValue(
                            "api_key"
                        )
                        .trim();

                await interaction.deferReply({
                    ephemeral: true
                });

                const result =
                    await verifyUser(
                        interaction.user.id,
                        apiKey
                    );

                if (!result.success) {

                    if (
                        result.reason?.error ===
                        "TORN_ACCOUNT_ALREADY_LINKED"
                    ) {
                        return interaction.editReply({
                            content:
                                "This Torn account is already linked to another Discord account."
                        });
                    }

                    return interaction.editReply({
                        content:
                            "Your key is not valid. Please try again."
                    });
                }

                const member =
                    interaction.guild.members.cache.get(
                        interaction.user.id
                    );

                if (member) {
                    await member.roles.remove(
                        config.UNVERIFIED_ROLE_ID
                    );

                    await member.roles.add(
                        config.VERIFIED_ROLE_ID
                    );
                }

                const successEmbed =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setDescription(
                            `**Verified Success.** Thank you <@${interaction.user.id}> for joining Torn HQ!\n\n` +
                            "**Do you want me to guide you to the server channels?**"
                        );

                const buttons =
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    "verification_guide_yes"
                                )
                                .setLabel("Yes")
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    "verification_guide_no"
                                )
                                .setLabel("No")
                                .set
