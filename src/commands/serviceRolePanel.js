const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');

const SERVICES_CHANNEL_ID =
    process.env.SERVICES_CHANNEL_ID;

const LOSS_SELLER_ROLE_ID =
    process.env.LOSS_SELLER_ROLE_ID;

const ESCAPE_SELLER_ROLE_ID =
    process.env.ESCAPE_SELLER_ROLE_ID;

const BOUNTY_PLACER_ROLE_ID =
    process.env.BOUNTY_PLACER_ROLE_ID;

const AGENCY_DETECTIVE_ROLE_ID =
    process.env.AGENCY_DETECTIVE_ROLE_ID;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('service-role-panel')
        .setDescription('Open the Torn HQ Service Role Panel.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        if (
            SERVICES_CHANNEL_ID &&
            interaction.channelId !== SERVICES_CHANNEL_ID
        ) {
            await interaction.reply({
                content:
                    'This command can only be used in the #Services channel.',
                ephemeral: true
            });

            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('Torn HQ Service')
            .setDescription('N/A');

        const row = new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId('service_loss_seller')
                    .setLabel('Loss Seller 🔫')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('service_escape_seller')
                    .setLabel('Escape Seller 🏃🏻')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('service_bounty_placer')
                    .setLabel('Bounty Placer 🎯')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('service_agency_detective')
                    .setLabel('Agency Detective 🕵🏻')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    },

    descriptions: {
        service_loss_seller:
            'Start a fight with the buyer or target, intentionally lose, then use a Small Aid Kit for 20 minutes or less hospital time, or a First Aid Kit for over 30 minutes. Repeat until you complete the number of losses in your claimed contract.',

        service_escape_seller:
            'Coming Soon',

        service_bounty_placer:
            'Once you claim a contract, the target\'s profile link will appear. Place a bounty on the target using the exact contract price. Reminder: Anonymous bounties will not be paid unless the contract is specifically marked as anonymous.',

        service_agency_detective:
            'Coming Soon'
    },

    roles: {
        service_loss_seller: LOSS_SELLER_ROLE_ID,
        service_escape_seller: ESCAPE_SELLER_ROLE_ID,
        service_bounty_placer: BOUNTY_PLACER_ROLE_ID,
        service_agency_detective: AGENCY_DETECTIVE_ROLE_ID
    }
};
