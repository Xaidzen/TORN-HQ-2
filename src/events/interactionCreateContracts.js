const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const {
    createLossContract,
    getContract,
    claimLosses,
    unclaimLosses,
    getUserActiveClaims
} = require("../modules/contractSystem");

function isStaffOrAdmin(interaction) {
    if (!interaction.member) return false;

    if (
        interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    if (
        interaction.member.permissions.has(
            PermissionFlagsBits.ManageGuild
        )
    ) {
        return true;
    }

    const staffRoleIds = (
        process.env.STAFF_ROLE_IDS || ""
    )
        .split(",")
        .map(id => id.trim())
        .filter(Boolean);

    return interaction.member.roles.cache.some(
        role => staffRoleIds.includes(role.id)
    );
}

function getContractButtons(contractId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`loss_claim:${contractId}`)
            .setLabel("Claim")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`loss_unclaim:${contractId}`)
            .setLabel("Unclaim")
            .setStyle(ButtonStyle.Danger)
    );
}

async function handleContractInteraction(interaction) {

    /*
     * CREATE CONTRACT
     */

    if (
        interaction.isButton() &&
        interaction.customId === "create_loss_contract"
    ) {
        if (!isStaffOrAdmin(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to create a contract.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("create_loss_contract_modal")
            .setTitle("Create Loss Contract");

        const targetInput = new TextInputBuilder()
            .setCustomId("target_id")
            .setLabel("Target Torn ID")
            .setPlaceholder("1234567")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const lossesInput = new TextInputBuilder()
            .setCustomId("loss_amount")
            .setLabel("Total Losses")
            .setPlaceholder("50")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const payoutInput = new TextInputBuilder()
            .setCustomId("payout_per_loss")
            .setLabel("Payout Per Loss")
            .setPlaceholder("300000")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(targetInput),
            new ActionRowBuilder().addComponents(lossesInput),
            new ActionRowBuilder().addComponents(payoutInput)
        );

        return interaction.showModal(modal);
    }

    /*
     * CREATE CONTRACT MODAL
     */

    if (
        interaction.isModalSubmit() &&
        interaction.customId ===
            "create_loss_contract_modal"
    ) {
        if (!isStaffOrAdmin(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to create a contract.",
                ephemeral: true
            });
        }

        const targetId =
            interaction.fields
                .getTextInputValue("target_id")
                .trim();

        const totalLosses = Number(
            interaction.fields.getTextInputValue(
                "loss_amount"
            )
        );

        const payoutPerLoss = Number(
            interaction.fields.getTextInputValue(
                "payout_per_loss"
            )
        );

        if (!/^\d+$/.test(targetId)) {
            return interaction.reply({
                content: "Please enter a valid Torn ID.",
                ephemeral: true
            });
        }

        if (
            !Number.isInteger(totalLosses) ||
            totalLosses < 1
        ) {
            return interaction.reply({
                content: "Please enter a valid loss amount.",
                ephemeral: true
            });
        }

        if (
            !Number.isInteger(payoutPerLoss) ||
            payoutPerLoss < 1
        ) {
            return interaction.reply({
                content: "Please enter a valid payout.",
                ephemeral: true
            });
        }

        const contract = createLossContract({
            targetId,
            totalLosses,
            payoutPerLoss,
            ticketId: interaction.channelId,
            createdBy: interaction.user.id
        });

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Loss Contract")
            .setDescription(
                `${contract.totalLosses}+ losses available.\n\n` +
                "Reminder: Use only pillow or plastic sword when attacking the buyer."
            )
            .addFields(
                {
                    name: "🎯 Target ID",
                    value: `${contract.targetId}`,
                    inline: true
                },
                {
                    name: "🎯 Target Link",
                    value: contract.targetLink,
                    inline: false
                },
                {
                    name: "💰 Payout Per Loss",
                    value:
                        `$${contract.payoutPerLoss.toLocaleString()}`,
                    inline: true
                },
                {
                    name: "📦 Available Losses",
                    value:
                        `${contract.availableLosses}`,
                    inline: true
                }
            );

        const channel =
            interaction.guild.channels.cache.find(
                channel =>
                    channel.name === "loss-contract"
            );

        if (!channel) {
            return interaction.reply({
                content:
                    "I could not find the #loss-contract channel.",
                ephemeral: true
            });
        }

        await channel.send({
            embeds: [embed],
            components: [
                getContractButtons(contract.id)
            ]
        });

        return interaction.reply({
            content:
                "Loss contract created successfully.",
            ephemeral: true
        });
    }

    /*
     * CLAIM
     */

    if (
        interaction.isButton() &&
        interaction.customId.startsWith("loss_claim:")
    ) {
        const contractId =
            interaction.customId.split(":")[1];

        const contract = getContract(contractId);

        if (!contract) {
            return interaction.reply({
                content:
                    "This contract no longer exists.",
                ephemeral: true
            });
        }

        if (
            contract.status !== "active" ||
            contract.availableLosses <= 0
        ) {
            return interaction.reply({
                content:
                    "There are no losses available.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(
                `loss_claim_modal:${contractId}`
            )
            .setTitle("Loss Claim");

        const amountInput = new TextInputBuilder()
            .setCustomId("claim_amount")
            .setLabel(
                "How many losses you want to claim?*"
            )
            .setPlaceholder("40")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                amountInput
            )
        );

        return interaction.showModal(modal);
    }

    /*
     * CLAIM MODAL
     */

    if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
            "loss_claim_modal:"
        )
    ) {
        const contractId =
            interaction.customId.split(":")[1];

        const amount = Number(
            interaction.fields.getTextInputValue(
                "claim_amount"
            )
        );

        if (
            !Number.isInteger(amount) ||
            amount < 1 ||
            amount > 40
        ) {
            return interaction.reply({
                content:
                    "You can only claim between 1 and 40 losses.",
                ephemeral: true
            });
        }

        const contract = getContract(contractId);

        if (!contract) {
            return interaction.reply({
                content:
                    "This contract no longer exists.",
                ephemeral: true
            });
        }

        if (amount > contract.availableLosses) {
            return interaction.reply({
                content:
                    `Only ${contract.availableLosses} losses are available.`,
                ephemeral: true
            });
        }

        let claim;

        try {
            claim = claimLosses(
                contractId,
                interaction.user.id,
                amount
            );
        } catch (error) {
            return interaction.reply({
                content: error.message,
                ephemeral: true
            });
        }

        const targetLink =
            `https://www.torn.com/profiles.php?XID=${claim.targetId}`;

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(
                `Losses Claimed #${claim.claimNumber}`
            )
            .setDescription(
                `You have claimed **${claim.amountClaimed}** losses on **${claim.contractId}**.`
            )
            .addFields(
                {
                    name: "🎯 Target ID",
                    value: `${claim.targetId}`,
                    inline: true
                },
                {
                    name: "🎯 Target Link",
                    value: targetLink,
                    inline: false
                },
                {
                    name: "Losses Claimed",
                    value:
                        `${claim.amountClaimed}`,
                    inline: true
                },
                {
                    name: "Payout",
                    value:
                        `$${claim.payout.toLocaleString()}`,
                    inline: true
                },
                {
                    name: "⏱️ Time Limit",
                    value:
                        "You have **30 minutes** to complete the losses. The bot will automatically track your attacks.",
                    inline: false
                },
                {
                    name: "Claim ID",
                    value:
                        `#${claim.claimNumber}`,
                    inline: true
                }
            );

        try {
            await interaction.user.send({
                embeds: [embed]
            });
        } catch {}

        return interaction.reply({
            content:
                `You successfully claimed ${amount} losses.`,
            ephemeral: true
        });
    }

    /*
     * UNCLAIM
     */

    if (
        interaction.isButton() &&
        interaction.customId.startsWith(
            "loss_unclaim:"
        )
    ) {
        const contractId =
            interaction.customId.split(":")[1];

        const claims =
            getUserActiveClaims(
                interaction.user.id
            );

        const claim = claims.find(
            item =>
                item.contractId === contractId &&
                (
                    item.status === "active" ||
                    item.status === "tracking"
                )
        );

        if (!claim) {
            return interaction.reply({
                content:
                    "You do not have an active claim on this contract.",
                ephemeral: true
            });
        }

        const result = unclaimLosses(
            claim.id,
            interaction.user.id
        );

        return interaction.reply({
            content:
                `Your claim has been unclaimed. ${result.returnedLosses} unfinished losses were returned to the contract.`,
            ephemeral: true
        });
    }

    return false;
}

module.exports = {
    handleContractInteraction
};
