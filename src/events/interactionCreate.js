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
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                        );

                await interaction.editReply({
                    embeds: [successEmbed],
                    components: [buttons]
                });

                return;
            }


            /*
             * VERIFICATION GUIDE YES
             */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "verification_guide_yes"
            ) {
                const guide =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle(
                            "Torn HQ Server Channels"
                        )
                        .setDescription(
                            "Here are the server channels available to you.\n\n" +
                            "<#ENTER_VERIFICATION_CHANNEL_ID> - Verification\n\n" +
                            "<#UNLOCK_SERVICE_CHANNEL_ID> - Unlock service roles\n\n" +
                            "<#ORDER_SERVICE_CHANNEL_ID> - Order Torn HQ services"
                        );

                await interaction.update({
                    embeds: [guide],
                    components: []
                });

                return;
            }


            /*
             * VERIFICATION GUIDE NO
             */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "verification_guide_no"
            ) {
                const goodbye =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setDescription(
                            `Have Fun <@${interaction.user.id}>! ☺️`
                        );

                await interaction.update({
                    embeds: [goodbye],
                    components: []
                });

                return;
            }


            /*
             * SERVICE ROLE BUTTONS
             */

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "service_"
                )
            ) {
                if (
                    !isVerified(
                        interaction.user.id
                    )
                ) {
                    return interaction.reply({
                        content:
                            "You must verify your Torn account first.",
                        ephemeral: true
                    });
                }

                const descriptions = {

                    service_loss:
                        "Start a fight with the buyer or target, intentionally lose, then use a Small Aid Kit for 20 minutes or less hospital time, or a First Aid Kit for over 30 minutes. Repeat until you complete the number of losses in your claimed contract.",

                    service_escape:
                        "Coming Soon",

                    service_bounty:
                        "Once you claim a contract, the target's profile link will appear. Place a bounty on the target using the exact contract price. Reminder: Anonymous bounties will not be paid unless the contract is specifically marked as anonymous.",

                    service_detective:
                        "Coming Soon"
                };

                const description =
                    descriptions[
                        interaction.customId
                    ];

                await giveServiceRole(
                    interaction.member,
                    interaction.customId
                );

                await interaction.reply({
                    content:
                        `You received the ${interaction.component.label} role.`,

                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setDescription(
                                description
                            )
                    ],

                    ephemeral: true
                });

                return;
            }


            /*
             * ORDER LOSSES
             */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "order_losses"
            ) {
                if (
                    !isVerified(
                        interaction.user.id
                    )
                ) {
                    return interaction.reply({
                        content:
                            "You must verify your Torn account first.",
                        ephemeral: true
                    });
                }

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            "loss_order_modal"
                        )
                        .setTitle(
                            "Order Losses"
                        );

                const amount =
                    new TextInputBuilder()
                        .setCustomId(
                            "loss_amount"
                        )
                        .setLabel(
                            "Number of losses"
                        )
                        .setPlaceholder(
                            "Example: 50"
                        )
                        .setStyle(
                            TextInputStyle.Short
                        )
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(9);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        amount
                    )
                );

                await interaction.showModal(
                    modal
                );

                return;
            }


            /*
             * LOSS ORDER MODAL
             */

            if (
                interaction.isModalSubmit() &&
                interaction.customId ===
                    "loss_order_modal"
            ) {
                const value =
                    interaction.fields
                        .getTextInputValue(
                            "loss_amount"
                        )
                        .trim();

                if (
                    !/^\d+$/.test(value)
                ) {
                    return interaction.reply({
                        content:
                            "Please enter a valid whole number between 1 and 999,999,999.",
                        ephemeral: true
                    });
                }

                const amount =
                    Number(value);

                if (
                    amount < 1 ||
                    amount > 999999999
                ) {
                    return interaction.reply({
                        content:
                            "The amount must be between 1 and 999,999,999.",
                        ephemeral: true
                    });
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                const channel =
                    await createLossTicket(
                        interaction.guild,
                        interaction.user,
                        amount
                    );

                await interaction.editReply({
                    content:
                        `Your loss order ticket has been created: ${channel}`
                });

                return;
            }


            /*
             * CLAIM TICKET
             */

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "claim_ticket_"
                )
            ) {
                if (
                    !isStaff(
                        interaction.member
                    )
                ) {
                    return interaction.reply({
                        content:
                            "You do not have permission to claim this ticket.",
                        ephemeral: true
                    });
                }

                const ticketId =
                    Number(
                        interaction.customId.replace(
                            "claim_ticket_",
                            ""
                        )
                    );

                const ticket =
                    getTicket(ticketId);

                if (!ticket) {
                    return interaction.reply({
                        content:
                            "Ticket not found.",
                        ephemeral: true
                    });
                }

                if (
                    ticket.claimer_discord_id
                ) {
                    return interaction.reply({
                        content:
                            "This ticket has already been claimed.",
                        ephemeral: true
                    });
                }

                claimTicket(
                    ticketId,
                    interaction.user.id
                );

                await interaction.channel.permissionOverwrites.edit(
                    config.STAFF_ROLE_ID,
                    {
                        SendMessages: false
                    }
                );

                await interaction.channel.permissionOverwrites.edit(
                    interaction.user.id,
                    {
                        SendMessages: true
                    }
                );

                await interaction.channel.permissionOverwrites.edit(
                    config.ADMIN_ROLE_ID,
                    {
                        SendMessages: true
                    }
                );

                const owner =
                    await interaction.guild.members.fetch(
                        ticket.owner_discord_id
                    );

                const amount =
                    Number(
                        ticket.price
                    ).toLocaleString();

                const staff =
                    getUser(
                        interaction.user.id
                    );

                if (!staff) {
                    return interaction.reply({
                        content:
                            "The staff member is not verified with a Torn API key.",
                        ephemeral: true
                    });
                }

                let staffTorn;

                try {
                    const staffApiKey =
                        decrypt(
                            staff.encrypted_api_key,
                            config.ENCRYPTION_KEY
                        );

                    staffTorn =
                        await getTornUser(
                            staffApiKey,
                            staff.torn_id
                        );

                } catch (error) {

                    console.error(
                        "Torn API error:",
                        error.message
                    );

                    return interaction.reply({
                        content:
                            "Unable to retrieve the staff member's Torn information.",
                        ephemeral: true
                    });
                }

                const profileImage =
                    staffTorn.profilePicture ||
                    interaction.user.displayAvatarURL({
                        extension: "png",
                        size: 256
                    });

                const staffEmbed =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle(
                            `Tornuser [${staffTorn.id}]`
                        )
                        .setThumbnail(
                            profileImage
                        )
                        .setDescription(
                            `**Profile Link:** ${staffTorn.profileLink}\n` +
                            `**Status:** ${staffTorn.status}\n` +
                            `**Faction:** ${staffTorn.faction}\n` +
                            `**Life:** ${staffTorn.lifeCurrent} / ${staffTorn.lifeMaximum}\n\n` +
                            `Please send the **${amount}** to the staff. ` +
                            `You can click the profile link or search the name or ID of the staff.\n\n` +
                            `Do you want <@${interaction.user.id}> to guide you for the order payment?`
                        );

                const buttons =
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    `payment_help_yes_${ticketId}`
                                )
                                .setLabel("Yes")
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    `payment_help_no_${ticketId}`
                                )
                                .setLabel("No")
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                        );

                await interaction.reply({
                    content:
                        `<@${interaction.user.id}> <@${ticket.owner_discord_id}>`,
                    embeds: [staffEmbed],
                    components: [buttons]
                });

                return;
            }


            /*
             * PAYMENT HELP YES
             */

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "payment_help_yes_"
                )
            ) {
                const ticketId =
                    Number(
                        interaction.customId.replace(
                            "payment_help_yes_",
           
