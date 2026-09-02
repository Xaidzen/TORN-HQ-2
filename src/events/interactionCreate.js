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

const database = require('../modules/database');

const VERIFICATION_CHANNEL_ID =
    process.env.VERIFICATION_CHANNEL_ID;

const VERIFIED_ROLE_ID =
    process.env.VERIFIED_ROLE_ID;

const UNVERIFIED_ROLE_ID =
    process.env.UNVERIFIED_ROLE_ID;

const SERVICE_ROLE_CHANNEL_ID =
    process.env.SERVICE_ROLE_CHANNEL_ID;

const ORDER_SERVICE_CHANNEL_ID =
    process.env.ORDER_SERVICE_CHANNEL_ID;

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
        description: 'Coming Soon'
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
        description: 'Coming Soon'
    }
};

const orderCounters = {
    loss: 0,
    escape: 0,
    bounty: 0,
    detective: 0
};

function getNextTicketNumber(type) {
    orderCounters[type]++;

    return String(
        orderCounters[type]
    ).padStart(3, '0');
}

function formatMoney(amount) {
    return Number(amount).toLocaleString('en-US');
}

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

function isAdministrator(interaction) {
    return Boolean(
        interaction.member &&
        interaction.member.permissions &&
        interaction.member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    );
}

async function handleVerificationCommand(interaction) {
    if (
        VERIFICATION_CHANNEL_ID &&
        interaction.channelId !==
        VERIFICATION_CHANNEL_ID
    ) {
        await interaction.reply({
            content:
                'You can only use `/verify` in the #Enter Verification channel.',
            ephemeral: true
        });

        return;
    }

    const embed =
        new EmbedBuilder()
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

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setLabel('Custom API Key')
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                        CUSTOM_API_KEY_URL
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        'verify_add_key'
                    )
                    .setLabel('Add Key')
                    .setStyle(
                        ButtonStyle.Success
                    )
            );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

async function handleAddKeyButton(interaction) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                'verify_api_key_modal'
            )
            .setTitle(
                'Add Torn API Key'
            );

    const input =
        new TextInputBuilder()
            .setCustomId(
                'torn_api_key'
            )
            .setLabel(
                'Torn API Key'
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setPlaceholder(
                'Paste your Torn API key here'
            )
            .setRequired(true)
            .setMinLength(10);

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(input)
    );

    await interaction.showModal(modal);
}

async function validateTornApiKey(apiKey) {
    try {
        const response = await fetch(
            `https://api.torn.com/user/?selections=profile&key=${encodeURIComponent(apiKey)}`
        );

        if (!response.ok) {
            return {
                valid: false
            };
        }

        const data =
            await response.json();

        if (
            !data ||
            data.error ||
            !data.player_id
        ) {
            return {
                valid: false
            };
        }

        return {
            valid: true,
            tornId: String(
                data.player_id
            )
        };

    } catch (error) {
        console.error(
            'Torn API verification error:',
            error
        );

        return {
            valid: false
        };
    }
}

async function handleApiKeyModal(interaction) {
    const apiKey =
        interaction.fields
            .getTextInputValue(
                'torn_api_key'
            )
            .trim();

    const result =
        await validateTornApiKey(apiKey);

    if (!result.valid) {

        await interaction.reply({
            content:
                'Your key is not valid. Please try again.',
            ephemeral: true
        });

        return;
    }

    const saveResult =
        database.saveVerifiedUser(
            interaction.user.id,
            result.tornId
        );

    if (
        !saveResult.success &&
        saveResult.reason ===
            'torn_account_already_linked'
    ) {

        await interaction.reply({
            content:
                'This Torn account is already linked to another Discord account.',
            ephemeral: true
        });

        return;
    }

    try {

        if (VERIFIED_ROLE_ID) {
            await interaction.member.roles.add(
                VERIFIED_ROLE_ID
            );
        }

        if (UNVERIFIED_ROLE_ID) {
            await interaction.member.roles.remove(
                UNVERIFIED_ROLE_ID
            );
        }

    } catch (error) {

        console.error(
            'Failed to update verification roles:',
            error
        );

        await interaction.reply({
            content:
                'Your Torn account was verified, but I could not update your Discord roles. Please contact staff.',
            ephemeral: true
        });

        return;
    }

    const embed =
        new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(
                'Verified Success'
            )
            .setDescription(
                `Thank you ${interaction.user} for joining Torn HQ!\n\nDo you want me to guide you to the server channels?`
            );

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        'verification_yes'
                    )
                    .setLabel('Yes')
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        'verification_no'
                    )
                    .setLabel('No')
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

async function handleServiceButton(interaction) {
    const service =
        SERVICE_DATA[
            interaction.customId
        ];

    if (
        SERVICE_ROLE_CHANNEL_ID &&
        interaction.channelId !==
        SERVICE_ROLE_CHANNEL_ID
    ) {
        await interaction.reply({
            content:
                'This service panel can only be used in the Unlock Services channel.',
            ephemeral: true
        });

        return;
    }

    if (!service.roleId) {
        await interaction.reply({
            content:
                'This service role has not been configured yet.',
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

    const botMember =
        interaction.guild.members.me;

    if (!botMember) {
        await interaction.reply({
            content:
                'The bot member could not be found.',
            ephemeral: true
        });

        return;
    }

    if (
        !botMember.permissions.has(
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
        botMember.roles.highest.position
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
            .setTitle(
                service.name
            )
            .setDescription(
                service.description
            );

    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

async function handleOrderLosses(interaction) {
    if (
        ORDER_SERVICE_CHANNEL_ID &&
        interaction.channelId !==
        ORDER_SERVICE_CHANNEL_ID
    ) {
        await interaction.reply({
            content:
                'The Order Service panel can only be used in the Order Service channel.',
            ephemeral: true
        });

        return;
    }

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

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                amountInput
            )
    );

    await interaction.showModal(
        modal
    );
}

async function handleComingSoon(interaction, title) {
    await interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle(title)
                .setDescription(
                    'Coming Soon'
                )
        ],
        ephemeral: true
    });
}

async function handleLossOrderModal(interaction) {
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

    if (
        !category ||
        category.type !==
            ChannelType.GuildCategory
    ) {
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

    const permissionOverwrites = [
        {
            id: interaction.guild.id,
            deny: [
                PermissionFlagsBits.ViewChannel
            ]
        },
        {
            id: interaction.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        }
    ];

    if (STAFF_ROLE_ID) {
        permissionOverwrites.push({
            id: STAFF_ROLE_ID,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        });
    }

    if (ADMIN_ROLE_ID) {
        permissionOverwrites.push({
            id: ADMIN_ROLE_ID,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        });
    }

    let ticket;

    try {

        ticket =
            await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites
            });

    } catch (error) {

        console.error(
            'Failed to create ticket:',
            error
        );

        await interaction.reply({
            content:
                'I could not create your ticket. Please contact staff.',
            ephemeral: true
        });

        return;
    }

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
                        formatMoney(price),
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
                        `ticket_claim_${interaction.user.id}`
                    )
                    .setLabel('Claim')
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `ticket_close_${interaction.user.id}`
                    )
                    .setLabel('Close')
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
}

async function handleTicketClaim(interaction) {
    if (!isStaffOrAdmin(interaction)) {
        await interaction.reply({
            content:
                'Only staff and administrators can claim tickets.',
            ephemeral: true
        });

        return;
    }

    const parts =
        interaction.customId.split('_');

    const customerId =
        parts[2];

    if (!customerId) {
        await interaction.reply({
            content:
                'The ticket owner could not be identified.',
            ephemeral: true
        });

        return;
    }

    const customerMention =
        `<@${customerId}>`;

    const claimantMention =
        `${interaction.user}`;

    const channel =
        interaction.channel;

    const messages =
        await channel.messages.fetch({
            limit: 20
        });

    const orderMessage =
        messages.find(
            message =>
                message.author.id ===
                    interaction.client.user.id &&
                message.embeds.length > 0 &&
                message.embeds[0].title &&
                message.embeds[0].title.includes(
                    'ordered losses'
                )
        );

    if (orderMessage) {

        const embed =
            EmbedBuilder.from(
                orderMessage.embeds[0]
            );

        embed.setDescription(
            `Your ticket has been claimed by ${claimantMention}. ${customerMention}`
        );

        await orderMessage.edit({
            embeds: [embed]
        });

    } else {

        await channel.send(
            `Your ticket has been claimed by ${claimantMention}. ${customerMention}`
        );
    }

        
