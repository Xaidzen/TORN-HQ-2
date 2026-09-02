const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const database =
    require('../modules/database');

const VERIFICATION_CHANNEL_ID =
    process.env.VERIFICATION_CHANNEL_ID;

const VERIFIED_ROLE_ID =
    process.env.VERIFIED_ROLE_ID;

const UNVERIFIED_ROLE_ID =
    process.env.UNVERIFIED_ROLE_ID;

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

const TICKET_CATEGORY_ID =
    process.env.TICKET_CATEGORY_ID;

const STAFF_ROLE_ID =
    process.env.STAFF_ROLE_ID;

const ADMIN_ROLE_ID =
    process.env.ADMIN_ROLE_ID;

const CUSTOM_API_KEY_URL =
    'https://www.torn.com/preferences.php#tab=api?step=addNewKey&user=faction,basic,bounties,discord,personalstats,profile,cooldowns,crimes&torn=attacklog,bounties,crimes&title=Torn%20HQ';


/*
 * SERVICE ROLE DATA
 */

const SERVICE_DATA = {

    service_loss_seller: {
        roleId: LOSS_SELLER_ROLE_ID,
        name: 'Loss Seller 🔫',
        description:
            'Start a fight with the buyer or target, intentionally lose, then use a Small Aid Kit for 20 minutes or less hospital time, or a First Aid Kit for over 30 minutes. Repeat until you complete the number of losses in your claimed contract.'
    },

    service_escape_seller: {
        roleId: ESCAPE_SELLER_ROLE_ID,
        name: 'Escape Seller 🏃🏻',
        description:
            'Coming Soon'
    },

    service_bounty_placer: {
        roleId: BOUNTY_PLACER_ROLE_ID,
        name: 'Bounty Placer 🎯',
        description:
            'Once you claim a contract, the target\'s profile link will appear. Place a bounty on the target using the exact contract price. Reminder: Anonymous bounties will not be paid unless the contract is specifically marked as anonymous.'
    },

    service_agency_detective: {
        roleId: AGENCY_DETECTIVE_ROLE_ID,
        name: 'Agency Detective 🕵🏻',
        description:
            'Coming Soon'
    }
};


/*
 * ORDER DATA
 */

const ORDER_DATA = {

    order_losses: {
        type: 'loss',
        name: 'losses',
        title: 'Order Losses'
    },

    order_escapes: {
        type: 'escape',
        name: 'escapes',
        title: 'Order Escapes'
    },

    order_bounties: {
        type: 'bounty',
        name: 'bounties',
        title: 'Order Bounties'
    },

    order_detective: {
        type: 'detective',
        name: 'detective',
        title: 'Order Detective'
    }
};


/*
 * ORDER COUNTER
 *
 * This is kept in memory while the bot is running.
 * A later database version can make the numbers permanent.
 */

const orderCounters = {
    loss: 0,
    bounty: 0,
    escape: 0,
    detective: 0
};


/*
 * GET NEXT TICKET NUMBER
 */

function getNextTicketNumber(type) {

    orderCounters[type]++;

    return String(
        orderCounters[type]
    ).padStart(3, '0');
}


/*
 * CHECK STAFF
 */

function isStaffOrAdmin(interaction) {

    if (!interaction.member) {
        return false;
    }

    if (
        interaction.member.permissions &&
        interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    if (
        STAFF_ROLE_ID &&
        interaction.member.roles.cache.has(
            STAFF_ROLE_ID
        )
    ) {
        return true;
    }

    if (
        ADMIN_ROLE_ID &&
        interaction.member.roles.cache.has(
            ADMIN_ROLE_ID
        )
    ) {
        return true;
    }

    return false;
}


/*
 * FORMAT MONEY
 */

function formatMoney(amount) {

    return Number(amount).toLocaleString(
        'en-US'
    );
}


module.exports = {

    name: Events.InteractionCreate,

    async execute(interaction) {

        try {

            /*
             * SLASH COMMANDS
             */

            if (interaction.isChatInputCommand()) {

                if (
                    interaction.commandName !== 'verify' &&
                    !database.isVerified(
                        interaction.user.id
                    )
                ) {

                    await interaction.reply({
                        content:
                            'You must verify your Torn account first.',
                        ephemeral: true
                    });

                    return;
                }

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
             * SERVICE ROLE BUTTONS
             */

            if (
                interaction.isButton() &&
                SERVICE_DATA[interaction.customId]
            ) {

                const service =
                    SERVICE_DATA[
                        interaction.customId
                    ];

                if (!service.roleId) {

                    await interaction.reply({
                        content:
                            'This service role has not been configured yet.',
                        ephemeral: true
                    });

                    return;
                }

                if (!interaction.member) {

                    await interaction.reply({
                        content:
                            'Unable to find your server membership.',
                        ephemeral: true
                    });

                    return;
                }

                const role =
                    interaction.guild.roles.cache.get(
                        service.roleId
                    );

                if (!role) {

                    await interaction.reply({
                        content:
                            'The service role could not be found.',
                        ephemeral: true
                    });

                    return;
                }

                if (
                    interaction.member.roles.cache.has(
                        service.roleId
                    )
                ) {

                    await interaction.reply({
                        content:
                            `You already have the ${service.name} role.`,
                        ephemeral: true
                    });

                    return;
                }

                if (
                    !interaction.guild.members.me
                        .permissions.has(
                            PermissionFlagsBits.ManageRoles
                        )
                ) {

                    await interaction.reply({
                        content:
                            'The bot does not have permission to manage roles.',
                        ephemeral: true
                    });

                    return;
                }

                if (
                    role.position >=
                    interaction.guild.members.me
                        .roles.highest.position
                ) {

                    await interaction.reply({
                        content:
                            'I cannot assign this role because it is above or equal to my highest role.',
                        ephemeral: true
                    });

                    return;
                }

                await interaction.member.roles.add(
                    role,
                    `Selected ${service.name} service`
                );

                const embed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(service.name)
                        .setDescription(
                            service.description
                        );

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });

                return;
            }


            /*
             * ORDER LOSSES BUTTON
             */

            if (
                interaction.isButton() &&
                interaction.customId === 'order_losses'
            ) {

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
                        .setStyle(
                            TextInputStyle.Short
                        )
                        .setPlaceholder(
                            'Example: 50'
                        )
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(6);

                const row =
                    new ActionRowBuilder()
                        .addComponents(
                            amountInput
                        );

                modal.addComponents(
                    row
                );

                await interaction.showModal(
                    modal
                );

                return;
            }


            /*
             * ORDER ESCAPES
             */

            if (
                interaction.isButton() &&
                interaction.customId === 'order_escapes'
            ) {

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFEE75C)
                            .setTitle(
                                'Order Escapes'
                            )
                            .setDescription(
                                'Coming Soon'
                            )
                    ],
                    ephemeral: true
                });

                return;
            }


            /*
             * ORDER BOUNTIES
             */

            if (
                interaction.isButton() &&
                interaction.customId === 'order_bounties'
            ) {

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFEE75C)
                            .setTitle(
                                'Order Bounties'
                            )
                            .setDescription(
                                'Coming Soon'
                            )
                    ],
                    ephemeral: true
                });

                return;
            }


            /*
             * ORDER DETECTIVE
             */

            if (
                interaction.isButton() &&
                interaction.customId === 'order_detective'
            ) {

                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xFEE75C)
                            .setTitle(
                                'Order Detective'
                            )
                            .setDescription(
                                'Coming Soon'
                            )
                    ],
                    ephemeral: true
                });

                return;
            }


            /*
             * LOSS ORDER MODAL
             */

            if (
                interaction.isModalSubmit() &&
                interaction.customId ===
                    'order_losses_modal'
            ) {

                const amount =
                    Number(
                        interaction.fields
                            .getTextInputValue(
                                'loss_amount'
                            )
                            .trim()
                    );

                if (
                    !Number.isInteger(amount) ||
                    amount <= 0
                ) {

                    await interaction.reply({
                        content:
                            'Please enter a valid number of losses.',
                        ephemeral: true
                    });

                    return;
                }

                const minimumPrice =
                    325000;

                const price =
                    amount *
                    minimumPrice;

                if (!TICKET_CATEGORY_ID) {

                    await interaction.reply({
                        content:
                            'The ticket category has not been configured yet.',
                        ephemeral: true
                    });

                    return;
                }

                const category =
                    interaction.guild.channels.cache.get(
                        TICKET_CATEGORY_ID
                    );

                if (!category) {

                    await interaction.reply({
                        content:
                            'The ticket category could not be found.',
                        ephemeral: true
                    });

                    return;
                }

                const number =
                    getNextTicketNumber(
                        'loss'
                    );

                const channelName =
                    `loss-order-${number}`;

                const ticket =
                    await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: TICKET_CATEGORY_ID,

                        permissionOverwrites: [

                            {
                                id:
                                    interaction.guild.id,

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

                const staffMention =
                    STAFF_ROLE_ID
                        ? `<@&${STAFF_ROLE_ID}>`
                        : '@staff';

                const adminMention =
                    ADMIN_ROLE_ID
                        ? `<@&${ADMIN_ROLE_ID}>`
                        : '@admin';

                const ticketEmbed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(
                            `${interaction.user} ordered losses`
                        )
                        .addFields(
                            {
                                name:
                                    'Amount of losses',
                                value:
                                    String(amount),
                                inline: true
                            },
                            {
                                name:
                                    'Price',
                                value:
                                    `${formatMoney(price)}`,
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
                                .setLabel(
                                    'Claim'
                                )
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'ticket_close'
                                )
                                .setLabel(
                                    'Close'
                                )
                                .setStyle(
                                    ButtonStyle.Danger
                                )
                        );

                await ticket.send({
                    content:
                        `${staffMention} ${adminMention}`,
                    embeds: [
                        ticketEmbed
                    ],
                    components: [
                        buttons
                    ]
                });

                await interaction.reply({
                    content:
                        `Your order has been created: ${ticket}`,
                    ephemeral: true
                });

                return;
            }


            /*
             * TICKET CLAIM
             */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    'ticket_claim'
            ) {

                if (
                    !isStaffOrAdmin(
                        interaction
                    )
                ) {

                    await interaction.reply({
                        content:
                            'Only staff and administrators can claim tickets.',
                        ephemeral: true
                    });

                    return;
                }

                const ticketUser =
                    interaction.channel.permissionOverwrites.cache
                        .find(
                            overwrite =>
                                overwrite.type === 1 &&
                                overwrite.allow.has(
                                    PermissionFlagsBits.ViewChannel
                  
