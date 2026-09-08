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
    closeTicket
} = require("../modules/ticketSystem");

const {
    isStaff
} = require("../utils/permissions");


module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        try {

            /* =========================
               SLASH COMMANDS
            ========================= */

            if (interaction.isChatInputCommand()) {
                const command =
                    interaction.client.commands.get(
                        interaction.commandName
                    );

                if (!command) return;

                await command.execute(interaction);
                return;
            }


            /* =========================
               VERIFY API KEY
            ========================= */

            if (
                interaction.isButton() &&
                interaction.customId === "verify_add_key"
            ) {
                const modal =
                    new ModalBuilder()
                        .setCustomId("verify_api_modal")
                        .setTitle("Torn API Verification");

                const apiInput =
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
                        apiInput
                    )
                );

                await interaction.showModal(modal);
                return;
            }


            /* =========================
               VERIFY MODAL
            ========================= */

            if (
                interaction.isModalSubmit() &&
                interaction.customId === "verify_api_modal"
            ) {
                const apiKey =
                    interaction.fields
                        .getTextInputValue("api_key")
                        .trim();

                await interaction.deferReply({
                    ephemeral: true
                });

                if (apiKey.length !== 16) {
                    await interaction.editReply({
                        content:
                            "Invalid Torn API key. Please enter your 16 Character Torn API Key."
                    });
                    return;
                }

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
                        await interaction.editReply({
                            content:
                                "This Torn account is already linked to another Discord account."
                        });
                        return;
                    }

                    await interaction.editReply({
                        content:
                            "Invalid Torn API key. Please check your API key and try again."
                    });

                    return;
                }

                const member =
                    interaction.member;

                if (
                    config.UNVERIFIED_ROLE_ID &&
                    member.roles.cache.has(
                        config.UNVERIFIED_ROLE_ID
                    )
                ) {
                    await member.roles.remove(
                        config.UNVERIFIED_ROLE_ID
                    ).catch(() => {});
                }

                if (config.VERIFIED_ROLE_ID) {
                    await member.roles.add(
                        config.VERIFIED_ROLE_ID
                    ).catch(() => {});
                }

                const embed =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle(
                            "Verified Success"
                        )
                        .setDescription(
                            `Thank you <@${interaction.user.id}> for joining Torn HQ!\n\n` +
                            "Do you want me to guide you to the server channels?"
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
                    embeds: [embed],
                    components: [buttons]
                });

                return;
            }


            /* =========================
               VERIFICATION GUIDE YES
            ========================= */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "verification_guide_yes"
            ) {
                const embed =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle(
                            "Torn HQ Server Guide"
                        )
                        .setDescription(
                            `Here are the important channels:\n\n` +
                            `🔐 Verification: <#ENTER_VERIFICATION_CHANNEL_ID>\n\n` +
                            `🔓 Service Roles: <#UNLOCK_SERVICE_CHANNEL_ID>\n\n` +
                            `📋 Order Service: <#ORDER_SERVICE_CHANNEL_ID>`
                        );

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

                return;
            }


            /* =========================
               VERIFICATION GUIDE NO
            ========================= */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "verification_guide_no"
            ) {
                await interaction.update({
                    content:
                        `Have Fun <@${interaction.user.id}>! ☺️`,
                    embeds: [],
                    components: []
                });

                return;
            }


            /* =========================
               SERVICE ROLE BUTTONS
            ========================= */

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
                    await interaction.reply({
                        content:
                            "You must verify your Torn account first.",
                        ephemeral: true
                    });

                    return;
                }

                const service =
                    interaction.customId.replace(
                        "service_",
                        ""
                    );

                const descriptions = {

                    loss:
                        "Start a fight with the buyer or target, intentionally lose, then use a Small Aid Kit for 20 minutes or less hospital time, or a First Aid Kit for over 30 minutes. Repeat until you complete the number of losses in your claimed contract.",

                    escape:
                        "Coming Soon",

                    bounty:
                        "Once you claim a contract, the target's profile link will appear. Place a bounty on the target using the exact contract price. Reminder: Anonymous bounties will not be paid unless the contract is specifically marked as anonymous.",

                    detective:
                        "Coming Soon"
                };

                const roleMap = {

                    loss:
                        config.LOSS_SELLER_ROLE_ID,

                    escape:
                        config.ESCAPE_SELLER_ROLE_ID,

                    bounty:
                        config.BOUNTY_PLACER_ROLE_ID,

                    detective:
                        config.DETECTIVE_ROLE_ID
                };

                const roleId =
                    roleMap[service];

                if (!roleId) {
                    await interaction.reply({
                        content:
                            descriptions[service] ||
                            "Coming Soon",
                        ephemeral: true
                    });

                    return;
                }

                await giveServiceRole(
                    interaction.member,
                    roleId
                );

                await interaction.reply({
                    content:
                        descriptions[service] ||
                        "Service role updated.",
                    ephemeral: true
                });

                return;
            }


            /* =========================
               ORDER LOSSES
            ========================= */

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
                    await interaction.reply({
                        content:
                            "You must verify your Torn account first.",
                        ephemeral: true
                    });

                    return;
                }

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            "order_losses_modal"
                        )
                        .setTitle(
                            "Order Losses"
                        );

                const amountInput =
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
                        amountInput
                    )
                );

                await interaction.showModal(modal);
                return;
            }

            if (
                interaction.isModalSubmit() &&
                interaction.customId === "order_losses_modal"
            ) {
                const amountText =
                    interaction.fields
                        .getTextInputValue("loss_amount")
                        .trim();

                const amount = Number(amountText);

                if (
                    !Number.isInteger(amount) ||
                    amount < 1 ||
                    amount > 999999999
                ) {
                    await interaction.reply({
                        content:
                            "Please enter a valid whole number of losses.",
                        ephemeral: true
                    });
                    return;
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
                        `Your loss order has been created: ${channel}`
                });

                return;
            }

            if (
                interaction.isButton() &&
                interaction.customId.startsWith("claim_ticket_")
            ) {
                if (!isStaff(interaction.member)) {
                    await interaction.reply({
                        content:
                            "Only staff can claim tickets.",
                        ephemeral: true
                    });
                    return;
                }

                const ticketId =
                    Number(
                        interaction.customId.replace(
                            "claim_ticket_",
                            ""
                        )
                    );

                const ticket = getTicket(ticketId);

                if (!ticket) {
                    await interaction.reply({
                        content: "Ticket not found.",
                        ephemeral: true
                    });
                    return;
                }

                if (ticket.claimer_discord_id) {
                    await interaction.reply({
                        content:
                            "This ticket has already been claimed.",
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferReply();

                const staffUser =
                    getUser(interaction.user.id);

                if (!staffUser) {
                    await interaction.editReply({
                        content:
                            "Your Discord account is not verified."
                    });
                    return;
                }

                let apiKey;

                try {
                    apiKey =
                        decrypt(
                            staffUser.encrypted_api_key,
                            config.ENCRYPTION_KEY
                        );
                } catch {
                    await interaction.editReply({
                        content:
                            "Unable to decrypt your Torn API key."
                    });
                    return;
                }

                let tornUser;

                try {
                    tornUser =
                        await getTornUser(
                            apiKey,
                            staffUser.torn_id
                        );
                } catch (error) {
                    console.error(
                        "Torn API error:",
                        error
                    );

                    await interaction.editReply({
                        content:
                            "Unable to retrieve your Torn City information."
                    });
                    return;
                }

                claimTicket(
                    ticketId,
                    interaction.user.id
                );

                await interaction.channel.permissionOverwrites.edit(
                    config.STAFF_ROLE_ID,
                    {
                        ViewChannel: true,
                        SendMessages: false,
                        ReadMessageHistory: true
                    }
                ).catch(() => {});

                await interaction.channel.permissionOverwrites.edit(
                    interaction.user.id,
                    {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    }
                ).catch(() => {});

                await interaction.channel.permissionOverwrites.edit(
                    config.ADMIN_ROLE_ID,
                    {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        ManageChannels: true
                    }
                ).catch(() => {});

                const informationEmbed =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle(
                            "Staff's Torn City Information"
                        )
                        .setDescription(
                            `**tornUser ${tornUser.id}**\n\n` +
                            `**Profile Picture:**\n` +
                            `${tornUser.profilePicture || "N/A"}\n\n` +
                            `**Profile Link:**\n` +
                            `${tornUser.profileLink}\n\n` +
                            `**Status:**\n` +
                            `${tornUser.status}\n\n` +
                            `**Life:**\n` +
                            `${tornUser.lifeCurrent} / ${tornUser.lifeMaximum}\n\n` +
                            `**Faction:**\n` +
                            `${tornUser.faction}\n\n` +
                            `**Property:**\n` +
                            `${tornUser.property || "N/A"}`
                        );

                if (tornUser.profilePicture) {
                    informationEmbed.setThumbnail(
                        tornUser.profilePicture
                    );
                }

                const paymentButtons =
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
                                    ButtonStyle.Danger
                                )
                        );

                await interaction.editReply({
                    embeds: [
                        informationEmbed
                    ],
                    components: [
                        paymentButtons
                    ]
                });

                return;
            }

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
                            ""
                        )
                    );

                const ticket = getTicket(ticketId);

                if (!ticket) {
                    await interaction.reply({
                        content:
                            "Ticket not found.",
                        ephemeral: true
                    });
                    return;
                }

                if (
                    interaction.user.id !==
                    ticket.owner_discord_id
                ) {
                    await interaction.reply({
                        content:
                            "Only the buyer who created this ticket can use these buttons.",
                        ephemeral: true
                    });
                    return;
                }

                await interaction.update({
                    components: []
                });

                const helpMessage =
                    await interaction.channel.send({
                        content:
                            `<@${ticket.claimer_discord_id}>, the buyer needs help.`
                    });

                setTimeout(
                    async () => {
                        await helpMessage
                            .delete()
                            .catch(() => {});
                    },
                    60000
                );

                return;
            }

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "payment_help_no_"
                )
            ) {
                const ticketId =
                    Number(
                        interaction.customId.replace(
                            "payment_help_no_",
                            ""
                        )
                    );

                const ticket = getTicket(ticketId);

                if (!ticket) {
                    await interaction.reply({
                        content:
                            "Ticket not found.",
                        ephemeral: true
                    });
                    return;
                }

                if (
                    interaction.user.id !==
                    ticket.owner_discord_id
                ) {
                    await interaction.reply({
                        content:
                            "Only the buyer who created this ticket can use these buttons.",
                        ephemeral: true
                    });
                    return;
                }

                await interaction.update({
                    components: []
                });

                await interaction.followUp({
                    content:
                        "Please proceed using the link to send the money to the staff, thank you for using the Torn HQ Service!",
                    ephemeral: true
                });

                await interaction.channel.permissionOverwrites.edit(
                    ticket.owner_discord_id,
                    {
                        SendMessages: false
                    }
                ).catch(() => {});

                return;
            }

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "close_ticket_"
                )
            ) {
                if (!isStaff(interaction.member)) {
                    await interaction.reply({
                        content:
                            "Only staff can close tickets.",
                        ephemeral: true
                    });
                    return;
                }

                const ticketId =
                    Number(
                        interaction.customId.replace(
                            "close_ticket_",
                            ""
                        )
                    );

                const ticket = getTicket(ticketId);

                if (!ticket) {
                    await interaction.reply({
                        content:
                            "Ticket not found.",
                        ephemeral: true
                    });
                    return;
                }

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            `close_ticket_modal_${ticketId}`
                        )
                        .setTitle(
                            "Close Ticket"
                        );

                const reasonInput =
                    new TextInputBuilder()
                        .setCustomId(
                            "close_reason"
                        )
                        .setLabel("Reason")
                        .setPlaceholder(
                            "Enter the reason for closing this ticket"
                        )
                        .setStyle(
                            TextInputStyle.Paragraph
                        )
                        .setRequired(true)
                        .setMaxLength(1000);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        reasonInput
                    )
                );

                await interaction.showModal(modal);
                return;
            }

            if (
                interaction.isModalSubmit() &&
                interaction.customId.startsWith(
                    "close_ticket_modal_"
                )
            ) {
                if (!isStaff(interaction.member)) {
                    await interaction.reply({
                        content:
                            "Only staff can close tickets.",
                        ephemeral: true
                    });
                    return;
                }

                const ticketId =
                    Number(
                        interaction.customId.replace(
                            "close_ticket_modal_",
                            ""
                        )
                    );

                const reason =
                    interaction.fields
                        .getTextInputValue(
                            "close_reason"
                        )
                        .trim();

                const ticket = getTicket(ticketId);

                if (!ticket) {
                    await interaction.reply({
                        content:
                            "Ticket not found.",
                        ephemeral: true
                    });
                    return;
                }

                closeTicket(
                    ticketId,
                    reason
                );

                await interaction.reply({
                    content:
                        "This ticket will be closed in 10 seconds."
                });

                setTimeout(
                    async () => {
                        await interaction.channel
                            .delete()
                            .catch(() => {});
                    },
                    10000
                );

                return;
            }

        } catch (error) {
            console.error("interactionCreate error:", error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content:
                        "Something went wrong while processing this interaction.",
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content:
                        "Something went wrong while processing this interaction.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
