const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const contractSystem = require('../modules/contractSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a contract.')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('Choose the contract type.')
                .setRequired(true)
                .addChoices(
                    { name: 'Loss', value: 'loss' },
                    { name: 'Bounty', value: 'bounty' }
                )
        ),

    async execute(interaction) {
        const type = interaction.options.getString('type');

        if (type === 'loss') {
            const contract = contractSystem.getAvailableContract(
                interaction.guild.id,
                'loss'
            );

            if (!contract) {
                return interaction.reply({
                    content: 'There are currently no available loss contracts.',
                    ephemeral: true
                });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`claim_contract_${contract.id}`)
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId(`unclaim_contract_${contract.id}`)
                    .setLabel('Unclaim')
                    .setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({
                content: `Loss Contract #${contract.id}`,
                embeds: [contractSystem.createLossEmbed(contract)],
                components: [row],
                ephemeral: true
            });
        }

        if (type === 'bounty') {
            return interaction.reply({
                content: 'Bounty claiming system is ready to be connected to the bounty contract system.',
                ephemeral: true
            });
        }
    }
};
