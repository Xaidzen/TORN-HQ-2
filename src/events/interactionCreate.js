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

const LOSS_PRICE = 325000;

const TORN_API_URL =
    'https://www.torn.com/preferences.php#tab=api?step=addNewKey&user=faction,basic,bounties,discord,personalstats,profile,cooldowns,crimes&torn=attacklog,bounties,crimes&title=Torn%20HQ';

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
            channel.name.startsWith(
                `${prefix}-`
            )
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

async function verifyTornApiKey(apiKey) {

    if (!apiKey) {
        return {
            success: false
        };
    }

    try {

        const response =
            await fetch(
                `${
