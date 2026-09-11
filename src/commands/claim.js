const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require('discord.js');

const contractSystem =
    require('../modules/contractSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('View your active loss claims.'),

    async execute(interaction) {
        const claims =
            contractSystem.getUserActiveClaims(
                interaction.user.id
            );

        if (!claims.length) {
            return interaction.reply({
                content:
                    'You do not have any active loss claims.',
                ephemeral: true
            });
        }

        const text = claims.map(claim => {
            return (
                `**Claim #${claim.claimNumber}**\n` +
                `Claim ID: \`${claim.id}\`\n` +
                `Progress: **${claim.completedLosses}/${claim.amountClaimed}**\n` +
                `Target: [${claim.targetId}](${claim.targetLink})`
            );
        }).join('\n\n');

        return interaction.reply({
            content: text,
            ephemeral: true
        });
    }
};
