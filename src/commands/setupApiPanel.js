const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const CUSTOM_API_KEY_URL =
    'https://www.torn.com/preferences.php#tab=api?step=addNewKey&user=faction,basic,bounties,discord,personalstats,profile,cooldowns,crimes&torn=attacklog,bounties,crimes&title=Torn%20HQ';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Open the Torn HQ verification panel.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(
                [
                    '**TORN HQ VERIFICATION**',
                    '',
                    '1. Click the link below.',
                    '',
                    '2. A key will appear and copy it.',
                    '',
                    '3. Paste the key in the Add Key below.'
                ].join('\n')
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Custom API Key')
                    .setStyle(ButtonStyle.Link)
                    .setURL(CUSTOM_API_KEY_URL),

                new ButtonBuilder()
                    .setCustomId('verify_add_key')
                    .setLabel('Add Key')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    }
};
