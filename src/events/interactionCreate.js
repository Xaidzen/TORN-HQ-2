const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const database = require('../modules/database');

const VERIFICATION_CHANNEL_ID =
    process.env.VERIFICATION_CHANNEL_ID;

const VERIFIED_ROLE_ID =
    process.env.VERIFIED_ROLE_ID;

const UNVERIFIED_ROLE_ID =
    process.env.UNVERIFIED_ROLE_ID;

const TICKET_CATEGORY_ID =
    process.env.TICKET_CATEGORY_ID;

const STAFF_ROLE_ID =
    process.env.STAFF_ROLE_ID;

const ADMIN_ROLE_ID =
    process.env.ADMIN_ROLE_ID;

const LOSS_SELLER_ROLE_ID =
    process.env.LOSS_SELLER_ROLE_ID;

const ESCAPE_SELLER_ROLE_ID =
    process.env.ESCAPE_SELLER_ROLE_ID;

const BOUNTY_PLACER_ROLE_ID =
    process.env.BOUNTY_PLACER_ROLE_ID;

const AGENCY_DETECTIVE_ROLE_ID =
    process.env.AGENCY_DETECTIVE_ROLE_ID;

const TORN_API_URL =
    'https://api.torn.com/user/?selections=profile&key=';

const LOSS_PRICE = 325000;

const SERVICE_DESCRIPTIONS = {
    service_loss_seller:
        'Start a fight with the buyer or target, intentionally lose, then use a Small Aid Kit for 20 minutes or less hospital time, or a First Aid Kit for over 30 minutes. Repeat until you complete the number of losses in your claimed contract.',

    service_escape_seller:
        'Coming Soon',

    service_bounty_placer:
        'Once you claim a contract, the target\'s profile link will appear. Place a bounty on the target using the exact contract price. Reminder: Anonymous bounties will not be paid unless the contract is specifically marked as anonymous.',

    service_agency_detective:
        'Coming Soon'
};

const SERVICE_ROLES = {
    service_loss_seller:
        LOSS_SELLER_ROLE_ID,

    service_escape_seller:
        ESCAPE_SELLER_ROLE_ID,

    service_bounty_placer:
        BOUNTY_PLACER_ROLE_ID,

    service_agency_detective:
        AGENCY_DETECTIVE_ROLE_ID
};

function isStaffOrAdmin(member) {
    if (!member) {
        return false;
    }

    return (
        member.roles.cache.has(STAFF_ROLE_ID) ||
        member.roles.cache.has(ADMIN_ROLE_ID) ||
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    );
}

function getTicketType(interaction) {
    if (
        interaction.channel &&
        interaction.channel.topic
    ) {
        return interaction.channel.topic;
    }

    return null;
}

function getTicketPrefix(type) {
    const prefixes = {
        losses: 'loss-order',
        escapes: 'escape-order',
        bounties: 'bounty-order',
        detective: 'detective-order'
    };

    return prefixes[type];
}

async function getNextTicketNumber(guild, prefix) {
    const channels =
        guild.channels.cache.filter(channel =>
            channel.name.startsWith(`${prefix}-`)
        );

    let highest = 0;

    for (const channel of channels.values()) {

        const match =
            channel.name.match(
                new RegExp(
                    `^${prefix}-(\\d+)$`
                )
            );

        if (!match) {
            continue;
        }

        const number =
            Number(match[1]);

        if (number > highest) {
            highest = number;
        }
    }

    return highest + 1;
}

async function createLossTicket(interaction, amount) {

    if (!interaction.guild) {
        return;
    }

    const price =
        amount * LOSS_PRICE;

    const number =
        await getNextTicketNumber(
            interaction.guild,
            'loss-order'
        );

    const channelName =
        `loss-order-${String(number).padStart(3, '0')}`;

    const channel =
        await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,

            parent:
                TICKET_CATEGORY_ID || null,

            topic:
                'losses',

            permissionOverwrites: [

                {
                    id:
                        interaction.guild.roles.everyone.id,

                    deny: [
                        PermissionFlagsBits.ViewChannel
                    ]
                },

                {
                    id:
                        interaction.user.id,

                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },

                ...(STAFF_ROLE_ID ? [{
                    id: STAFF_ROLE_ID,

                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }] : []),

                ...(ADMIN_ROLE_ID ? [{
                    id: ADMIN_ROLE_ID,

                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }] : [])
            ]
        });

    const embed =
        new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(
                `${interaction.user} ordered losses`
            )
            .addFields(
                {
                    name: 'Amount of losses',
                    value: String(amount),
                    inline: true
                },
                {
                    name: 'Price',
                    value:
                        price.toLocaleString(),
                    inline: true
                }
            )
            .setDescription(
                'Please patiently wait for the staff to claim your order.'
            );

    const buttons =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        'ticket_claim'
                    )
                    .setLabel('Claim')
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        'ticket_close'
                    )
                    .setLabel('Close')
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    const staffMention =
        STAFF_ROLE_ID
            ? `<@&${STAFF_ROLE_ID}>`
            : '';

    const adminMention =
        ADMIN_ROLE_ID
            ? `<@&${ADMIN_ROLE_ID}>`
            : '';

    await channel.send({
        content:
            `${interaction.user} ${staffMention} ${adminMention}`,

        embeds: [embed],

        components: [buttons]
    });

    return channel;
}

async function verifyTornApiKey(apiKey) {

    if (!apiKey) {
        return {
            success: false
        };
    }

    try {

        const response =
            await fetch(
                `${TORN_API_URL}${encodeURIComponent(apiKey)}`
            );

        if (!response.ok) {
            return {
                success: false
            };
        }

        const data =
            await response.json();

        if (
            !data ||
            !data.player_id
        ) {
            return {
                success: false
            };
        }

        return {
            success: true,
            tornId: String(data.player_id)
        };

    } catch (error) {

        console.error(
            'Torn API verification error:',
            error
        );

        return {
            success: false
        };
    }
}

module.exports = {
    name: Events.InteractionCreate,

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

                if (!command) {
                    return;
                }

                /*
                 * Only /verify can be used
                 * by unverified users.
                 */

                if (
                    interaction.commandName !==
                    'verify'
                ) {

                    if (
                        !database.isVerified(
                            interaction.user.id
                        )
                    ) {

                        return interaction.reply({
                            content:
                                'You must verify your Torn account first using `/verify` in the #Enter Verification channel.',
                            ephemeral: true
                        });
                    }
                }

                await command.execute(
                    interaction
                );

                return;
            }

            /*
             * BUTTONS
             */

            if (interaction.isButton()) {

                /*
                 * ADD API KEY
                 */

                if (
                    interaction.customId ===
                    'verify_add_key'
                ) {

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                'verify_api_modal'
                            )
                            .setTitle(
                                'Add Torn API Key'
                            );

                    const keyInput =
                        new TextInputBuilder()
                            .setCustomId(
                                'torn_api_key'
                            )
                            .setLabel(
                                'Torn API Key'
                            )
                            .setPlaceholder(
                                'Enter your Torn API key'
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true);

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                keyInput
                            );

                    modal.addComponents(row);

                    await interaction.showModal(
                        modal
                    );

                    return;
                }

                /*
                 * VERIFICATION YES
                 */

                if (
                    interaction.customId ===
                    'verification_yes'
                ) {

                    return interaction.update({
                        content:
                            'Server channels will be added here later.',
                        embeds: [],
                        components: []
                    });
                }

                /*
                 * VERIFICATION NO
                 */

                if (
                    interaction.customId ===
                    'verification_no'
                ) {

                    return interaction.update({
                        content:
                            `Have Fun ${interaction.user}! ☺️`,
                        embeds: [],
                        components: []
                    });
                }

                /*
                 * SERVICE ROLE BUTTONS
                 */

                if (
                    SERVICE_ROLES[
                        interaction.customId
                    ]
                ) {

                    if (
                        !database.isVerified(
                            interaction.user.id
                        )
                    ) {

                        return interaction.reply({
                            content:
                                'You must verify your Torn account first.',
                            ephemeral: true
                        });
                    }

                    const roleId =
                        SERVICE_ROLES[
                            interaction.customId
                        ];

                    const member =
                        interaction.member;

                    if (!member) {
                        return;
                    }

                    if (
                        member.roles.cache.has(
                            roleId
                        )
                    ) {

                        await member.roles.remove(
                            roleId
                        );

                        return interaction.reply({
                            content:
                                `Removed the ${interaction.customId.replace('service_', '').replaceAll('_', ' ')} role from you.`,
                            ephemeral: true
                        });
                    }

                    await member.roles.add(
                        roleId
                    );

                    return interaction.reply({
                        content:
                            `You have been given the ${interaction.customId.replace('service_', '').replaceAll('_', ' ')} role.`,
                        ephemeral: true
                    });
                }

                /*
                 * ORDER LOSSES
                 */

                if (
                    interaction.customId ===
                    'order_losses'
                ) {

                    if (
                        !database.isVerified(
                            interaction.user.id
                        )
                    ) {

                        return interaction.reply({
                            content:
                                'You must verify your Torn account first.',
                            ephemeral: true
                        });
                    }

                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                0x57F287
                            )
                            .setDescription(
                                [
                                    '**Minimum Price: 325,000**',
                                    '',
                                    '**For the Loss Seller: 300,000**',
                                    '',
                                    '**For the Fee Order: 25,000**'
                                ].join('\n')
                            );

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                'order_losses_modal'
                            )
                            .setTitle(
                                'Order Losses'
                            );

                    const amountInput =
                        new TextInputBuilder()
                            .setCustomId(
                                'loss_amount'
                            )
                            .setLabel(
                                'Amount of losses'
                            )
                            .setPlaceholder(
                                'Example: 50'
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true);

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                amountInput
                            )
                    );

                    await interaction.showModal(
                        modal
                    );

                    return;
                }

                /*
                 * COMING SOON ORDERS
                 */

                if (
                    interaction.customId ===
                    'order_escapes' ||
                    interaction.customId ===
                    'order_bounties' ||
                    interaction.customId ===
                    'order_detective'
                ) {

                    if (
                        !database.isVerified(
                            interaction.user.id
                        )
                    ) {

                        return interaction.reply({
                            content:
                                'You must verify your Torn account first.',
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        content:
                            'Coming Soon',
                        ephemeral: true
                    });
                }

                /*
                 * CLAIM TICKET
                 */

                if (
                    interaction.customId ===
                    'ticket_claim'
                ) {

                    if (
                        !isStaffOrAdmin(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                'Only Staff and Admin can claim tickets.',
                            ephemeral: true
                        });
                    }

                    const channel =
                        interaction.channel;

                    if (!channel) {
                        return;
                    }

                    return interaction.reply({
                        content:
                            `Your ticket has been claimed by ${interaction.user}. <@${channel.topic === 'losses' ? channel.name : interaction.user.id}>`,
                    });
                }

                /*
                 * CLOSE TICKET
                 */

                if (
                    interaction.customId ===
                    'ticket_close'
                ) {

                    if (
                        !isStaffOrAdmin(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                'Only Staff and Admin can close tickets.',
                            ephemeral: true
                        });
                    }

                    await interaction.reply({
                        content:
                            'This ticket will be closed in 5 seconds.'
                    });

                    setTimeout(
                        async () => {

                            try {

                                await interaction.channel.delete(
                                   
