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

const contractSystem =
    require("../modules/contractSystem");

const claimTracker =
    require("../modules/claimTracker");


module.exports = {
    name: "interactionCreate",

    async execute(interaction) {

        /*
        ============================================================
        VERIFICATION CHECK
        ============================================================
        */

        if (
            interaction.isChatInputCommand() &&
            interaction.commandName !== "verify"
        ) {
            const verified =
                interaction.member?.roles?.cache?.has(
                    config.VERIFIED_ROLE_ID
                );

            if (!verified) {
                await interaction.reply({
                    content:
                        "You must verify your Torn account first using `/verify`.",
                    ephemeral: true
                });

                return;
            }
        }


        /*
        ============================================================
        VERIFICATION CHANNEL
        ============================================================
        */

        if (
            interaction.isChatInputCommand() &&
            interaction.channelId ===
                config.ENTER_VERIFICATION_CHANNEL_ID &&
            interaction.commandName !== "verify"
        ) {
            await interaction.reply({
                content:
                    "Only `/verify` can be used in this channel.",
                ephemeral: true
            });

            return;
        }


        try {

            /*
            ========================================================
            CREATE LOSS CONTRACT BUTTON
            ========================================================
            */

            if (
                interaction.isButton() &&
                interaction.customId === "create_contract"
            ) {

                const staff =
                    isStaff(interaction.member);

                const administrator =
                    interaction.member.permissions.has(
                        PermissionFlagsBits.Administrator
                    );

                if (!staff && !administrator) {
                    await interaction.reply({
                        content:
                            "Only staff members can create contracts.",
                        ephemeral: true
                    });

                    return;
                }

                const modal =
                    new ModalBuilder()
                        .setCustomId("create_loss_contract")
                        .setTitle("Create Loss Contract");

                const targetInput =
                    new TextInputBuilder()
                        .setCustomId("target_id")
                        .setLabel("Target Torn ID")
                        .setPlaceholder("Example: 1234567")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(10);

                const lossesInput =
                    new TextInputBuilder()
                        .setCustomId("loss_amount")
                        .setLabel("Number of Losses")
                        .setPlaceholder("Example: 50")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(3);

                const payoutInput =
                    new TextInputBuilder()
                        .setCustomId("payout")
                        .setLabel("Total Payout")
                        .setPlaceholder("Example: 15000000")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(15);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        targetInput
                    ),
                    new ActionRowBuilder().addComponents(
                        lossesInput
                    ),
                    new ActionRowBuilder().addComponents(
                        payoutInput
                    )
                );

                await interaction.showModal(modal);

                return;
            }


            /*
            ========================================================
            CREATE LOSS CONTRACT MODAL
            ========================================================
            */

            if (
                interaction.isModalSubmit() &&
                interaction.customId === "create_loss_contract"
            ) {

                const targetId =
                    interaction.fields
                        .getTextInputValue("target_id")
                        .trim();

                const lossesText =
                    interaction.fields
                        .getTextInputValue("loss_amount")
                        .trim();

                const payoutText =
                    interaction.fields
                        .getTextInputValue("payout")
                        .trim();

                const totalLosses =
                    Number(lossesText);

                const payout =
                    Number(payoutText);

                if (
                    !/^\d+$/.test(targetId) ||
                    Number(targetId) <= 0
                ) {
                    await interaction.reply({
                        content:
                            "Please enter a valid Torn target ID.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    !Number.isInteger(totalLosses) ||
                    totalLosses < 1
                ) {
                    await interaction.reply({
                        content:
                            "Please enter a valid number of losses.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    !Number.isInteger(payout) ||
                    payout <= 0
                ) {
                    await interaction.reply({
                        content:
                            "Please enter a valid payout.",
                        ephemeral: true
                    });

                    return;
                }

                const targetLink =
                    `https://www.torn.com/profiles.php?XID=${targetId}`;

                const payoutPerLoss =
                    Math.floor(
                        payout / totalLosses
                    );

                let contract;

                try {

                    contract =
                        contractSystem.createLossContract({
                            targetId: Number(targetId),
                            targetLink,
                            totalLosses,
                            availableLosses: totalLosses,
                            payout,
                            payoutPerLoss,
                            guildId: interaction.guild.id,
                            channelId: interaction.channel.id,
                            createdBy: interaction.user.id
                        });

                } catch (error) {

                    console.error(
                        "Create contract error:",
                        error
                    );

                    await interaction.reply({
                        content:
                            error.message ||
                            "Unable to create the loss contract.",
                        ephemeral: true
                    });

                    return;
                }

                const channel =
                    interaction.guild.channels.cache.find(
                        channel =>
                            channel.name === "loss-contract"
                    );

                if (!channel) {
                    await interaction.reply({
                        content:
                            "I could not find the #loss-contract channel.",
                        ephemeral: true
                    });

                    return;
                }

                const embed =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle("Loss Contract")
                        .setDescription(
                            `**${totalLosses} losses available.**\n\n` +
                            "Reminder: Use only pillow or plastic sword when attacking the buyer."
                        )
                        .addFields(
                            {
                                name: "🎯 Target",
                                value:
                                    `[${targetId}](${targetLink})`,
                                inline: true
                            },
                            {
                                name: "💰 Total Payout",
                                value:
                                    payout.toLocaleString(),
                                inline: true
                            },
                            {
                                name: "💵 Payout Per Loss",
                                value:
                                    payoutPerLoss.toLocaleString(),
                                inline: true
                            },
                            {
                                name: "📦 Available",
                                value:
                                    String(totalLosses),
                                inline: true
                            },
                            {
                                name: "🆔 Contract",
                                value:
                                    `#${contract.id}`,
                                inline: true
                            }
                        );

                const buttons =
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    `loss_claim:${contract.id}`
                                )
                                .setLabel("Claim")
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    `loss_unclaim:${contract.id}`
                                )
                                .setLabel("Unclaim")
                                .setStyle(
                                    ButtonStyle.Danger
                                )
                        );

                await channel.send({
                    embeds: [embed],
                    components: [buttons]
                });

                await interaction.reply({
                    content:
                        `Loss Contract #${contract.id} has been created in <#${channel.id}>.`,
                    ephemeral: true
                });

                return;
            }


            /*
            ========================================================
            LOSS CONTRACT CLAIM BUTTON
            ========================================================
            */

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "loss_claim:"
                )
            ) {

                const contractId =
                    interaction.customId
                        .replace("loss_claim:", "");

                const contract =
                    contractSystem.getContract(
                        contractId
                    );

                if (!contract) {
                    await interaction.reply({
                        content:
                            "This loss contract no longer exists.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    contract.status !== "active"
                ) {
                    await interaction.reply({
                        content:
                            "This loss contract is no longer available.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    contract.availableLosses <= 0
                ) {
                    await interaction.reply({
                        content:
                            "There are no losses available in this contract.",
                        ephemeral: true
                    });

                    return;
                }

                const existingClaim =
                    claimTracker.getActiveClaimForUser(
                        interaction.user.id,
                        contractId
                    );

                if (existingClaim) {
                    await interaction.reply({
                        content:
                            `You already have Claim #${existingClaim.id} for this contract.`,
                        ephemeral: true
                    });

                    return;
                }

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            `loss_claim_modal:${contractId}`
                        )
                        .setTitle("Loss Claim");

                const amountInput =
                    new TextInputBuilder()
                        .setCustomId("loss_amount")
                        .setLabel(
                            "How many losses you want to claim?"
                        )
                        .setPlaceholder("Example: 40")
                        .setStyle(
                            TextInputStyle.Short
                        )
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(2);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        amountInput
                    )
                );

                await interaction.showModal(modal);

                return;
            }


            /*
            ========================================================
            LOSS CLAIM MODAL
            ========================================================
            */

            if (
                interaction.isModalSubmit() &&
                interaction.customId.startsWith(
                    "loss_claim_modal:"
                )
            ) {

                const contractId =
                    interaction.customId
                        .replace(
                            "loss_claim_modal:",
                            ""
                        );

                const amountText =
                    interaction.fields
                        .getTextInputValue(
                            "loss_amount"
                        )
                        .trim();

                const amount =
                    Number(amountText);

                if (
                    !Number.isInteger(amount) ||
                    amount < 1 ||
                    amount > 40
                ) {
                    await interaction.reply({
                        content:
                            "You can only claim between 1 and 40 losses.",
                        ephemeral: true
                    });

                    return;
                }

                const contract =
                    contractSystem.getContract(
                        contractId
                    );

                if (!contract) {
                    await interaction.reply({
                        content:
                            "This loss contract no longer exists.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    contract.status !== "active"
                ) {
                    await interaction.reply({
                        content:
                            "This loss contract is no longer available.",
                        ephemeral: true
                    });

                    return;
                }

                if (
                    amount >
                    contract.availableLosses
                ) {
                    await interaction.reply({
                        content:
                            `Only ${contract.availableLosses} losses are currently available.`,
                        ephemeral: true
                    });

                    return;
                }

                const existingClaim =
                    claimTracker.getActiveClaimForUser(
                        interaction.user.id,
                        contractId
                    );

                if (existingClaim) {
                    await interaction.reply({
                        content:
                            `You already have Claim #${existingClaim.id} for this contract.`,
                        ephemeral: true
                    });

                    return;
                }

                const user =
                    getUser(
                        interaction.user.id
                    );

                if (!user) {
                    await interaction.reply({
                        content:
                            "You must verify your Torn account before claiming a contract.",
                        ephemeral: true
                    });

                    return;
                }

                try {

                    const payout =
                        Math.floor(
                            contract.payoutPerLoss *
                            amount
                        );

                    const claim =
                        claimTracker.createClaim({
                            contractId,
                            guildId:
                                interaction.guild.id,
                            discordUserId:
                                interaction.user.id,
                            tornUserId:
                                user.torn_id,
                            targetId:
                                contract.targetId,
                            targetLink:
                                `https://www.torn.com/profiles.php?XID=${contract.targetId}`,
                            amountClaimed:
                                amount,
                            completedLosses: 0,
                            payout
                        });

contractSystem.claimLosses(
                        contractId,
                        amount
                    );

                    await interaction.reply({
                        content:
                            `Claim #${claim.id} created. Check your Direct Messages.`,
                        ephemeral: true
                    });

                    const claimEmbed =
                        new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setTitle(
                                `Losses Claimed #${claim.id}`
                            )
                            .setDescription(
                                `You have claimed ${amount} losses on L#${contract.id}.`
                            )
                            .addFields(
                                {
                                    name: "🎯 Target ID",
                                    value:
                                        String(
                                            contract.targetId
                                        )
                                },
                                {
                                    name: "🎯 Target Link",
                                    value:
                                        `https://www.torn.com/profiles.php?XID=${contract.targetId}`
                                },
                                {
                                    name: "Losses Claimed",
                                    value:
                                        String(amount),
                                    inline: true
                                },
                                {
                                    name: "Payout",
                                    value:
                                        payout.toLocaleString(),
                                    inline: true
                                },
                                {
                                    name: "⏱️ Time",
                                    value:
                                        "You have 30 minutes to complete the losses. The bot will automatically track your attacks."
                                },
                                {
                                    name: "Claim ID",
                                    value:
                                        `#${claim.id}`
                                }
                            );

                    try {
                        await interaction.user.send({
                            embeds: [claimEmbed]
                        });
                    } catch (error) {
                        console.error(
                            "Unable to DM claimant:",
                            error.message
                        );
                    }

                } catch (error) {

                    console.error(
                        "Loss claim error:",
                        error
                    );

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {
                        await interaction.reply({
                            content:
                                error.message ||
                                "Unable to create your claim.",
                            ephemeral: true
                        });
                    }
                }

                return;
            }


            /*
            ========================================================
            UNCLAIM LOSS CONTRACT
            ========================================================
            */

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "loss_unclaim:"
                )
            ) {

                const contractId =
                    interaction.customId
                        .replace(
                            "loss_unclaim:",
                            ""
                        );

                const claim =
                    claimTracker.getActiveClaimForUser(
                        interaction.user.id,
                        contractId
                    );

                if (!claim) {
                    await interaction.reply({
                        content:
                            "You do not have an active claim for this contract.",
                        ephemeral: true });

                    return;
                }

                const unfinished =
                    Math.max(
                        0,
                        claim.amountClaimed -
                        claim.completedLosses
                    );

                try {

                    claimTracker.unclaim(
                        claim.id,
                        interaction.user.id
                    );

                    if (unfinished > 0) {
                        contractSystem.unclaimLosses(
                            contractId,
                            unfinished
                        );
                    }

                    await interaction.reply({
                        content:
                            `Claim #${claim.id} has been unclaimed.\n${unfinished} unfinished losses have been returned to the contract.`,
                        ephemeral: true
                    });

                } catch (error) {

                    console.error(
                        "Unclaim error:",
                        error
                    );

                    await interaction.reply({
                        content:
                            error.message ||
                            "Unable to unclaim your losses.",
                        ephemeral: true
                    });
                }

                return;
            }


            /*
            ========================================================
            SLASH COMMANDS
            ========================================================
            */

            if (
                interaction.isChatInputCommand()
            ) {

                const command =
                    interaction.client.commands.get(
                        interaction.commandName
                    );

                if (!command) {
                    return;
                }

                await command.execute(
                    interaction
                );

                return;
            }


            /*
            ========================================================
            VERIFY API KEY BUTTON
            ========================================================
            */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "verify_add_key"
            ) {

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            "verify_api_modal"
                        )
                        .setTitle(
                            "Torn API Verification"
                        );

                const apiInput =
                    new TextInputBuilder()
                        .setCustomId(
                            "api_key"
                        )
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

                await interaction.showModal(
                    modal
                );

                return;
            }


            /*
            ========================================================
            VERIFY API MODAL
            ========================================================
            */

            if (
                interaction.isModalSubmit() &&
                interaction.customId ===
                    "verify_api_modal"
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
                    await member.roles
                        .remove(
                            config.UNVERIFIED_ROLE_ID
                        )
                        .catch(() => {});
                }

                if (
                    config.VERIFIED_ROLE_ID
                ) {
                    await member.roles
                        .add(
                            config.VERIFIED_ROLE_ID
                        )
                        .catch(() => {});
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


            /*
            ========================================================
            VERIFICATION GUIDE YES
            ========================================================
            */

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
                            "Welcome to Torn HQ!\n\n" +
                            "Check the server channels to find services, important information, contracts, and other Torn related features."
                        );

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

                return;
            }


            /*
            ========================================================
            VERIFICATION GUIDE NO
            ========================================================
            */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "verification_guide_no"
            ) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle(
                            "Have Fun!"
                        )
                        .setDescription(
                            `Have Fun <@${interaction.user.id}>! ☺️`
                        );

                await interaction.update({
                    embeds: [embed],
                    components: []
                });

                return;
            }

        } catch (error) {

            console.error(
                "Interaction error:",
                error
            );

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {
                    await interaction.followUp({
                        content:
                            "Something went wrong while processing this interaction.",
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content:
                            "Something went wrong while processing this interaction.",
                        ephemeral: true
                    });
                }

            } catch (replyError) {
                console.error(
                    "Unable to send error response:",
                    replyError
                );
            }
        }
    }
};
