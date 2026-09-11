const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("./database");
const config = require("../utils/config");
const { sendLog } = require("./tornLogger");

const LOSS_RATE = 325000;

function calculateLossPrice(amount) {
    return amount * LOSS_RATE;
}

async function createLossTicket(guild, user, amount) {
    const price = calculateLossPrice(amount);

    const existingTickets = db.prepare(`
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE type = 'loss'
    `).get();

    const number = Number(existingTickets.count) + 1;

    const suffix = String(number).padStart(3, "0");

    const channelName =
        `loss-order-${user.username
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 15)}-${suffix}`;

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: config.TICKET_CATEGORY_ID,
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            },
            {
                id: config.STAFF_ROLE_ID,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            },
            {
                id: config.ADMIN_ROLE_ID,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels
                ]
            }
        ]
    });

    const result = db.prepare(`
        INSERT INTO tickets (
            channel_id,
            owner_discord_id,
            type,
            amount,
            price,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        channel.id,
        user.id,
        "loss",
        amount,
        price,
        Date.now()
    );

    const ticketId = Number(result.lastInsertRowid);

    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(
            `<@${user.id}> ordered losses.\n\n` +
            `**Amount of losses:** ${amount.toLocaleString()}\n` +
            `**Rate:** ${LOSS_RATE.toLocaleString()}\n` +
            `**Price:** ${price.toLocaleString()}\n\n` +
            "Please patiently wait for the staff to claim your order."
        );

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`claim_ticket_${ticketId}`)
            .setLabel("Claim")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`close_ticket_${ticketId}`)
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
        content:
            `<@&${config.ADMIN_ROLE_ID}> ` +
            `<@&${config.STAFF_ROLE_ID}> ` +
            `<@${user.id}>`,

        embeds: [embed],
        components: [buttons]
    });

    await sendLog(
        guild,
        "ticket",
        {
            customer: `<@${user.id}>`,
            tornAccount: "Loss order",
            service: "Loss Seller",
            price: price,
            status: "Opened",
            ticket: `<#${channel.id}>`,
            staff: "Unclaimed"
        }
    );

    return channel;
}

function getTicketByChannel(channelId) {
    return db.prepare(`
        SELECT *
        FROM tickets
        WHERE channel_id = ?
    `).get(channelId);
}

function getTicket(ticketId) {
    return db.prepare(`
        SELECT *
        FROM tickets
        WHERE ticket_id = ?
    `).get(ticketId);
}

function claimTicket(ticketId, staffId) {
    db.prepare(`
        UPDATE tickets
        SET
            claimer_discord_id = ?,
            claimed_at = ?
        WHERE ticket_id = ?
    `).run(
        staffId,
        Date.now(),
        ticketId
    );
}

function closeTicket(ticketId, reason) {
    db.prepare(`
        UPDATE tickets
        SET
            closed_at = ?,
            close_reason = ?
        WHERE ticket_id = ?
    `).run(
        Date.now(),
        reason,
        ticketId
    );
}

function saveMessage(
    ticketId,
    discordId,
    username,
    content
) {
    db.prepare(`
        INSERT INTO ticket_messages (
            ticket_id,
            discord_id,
            username,
            content,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
    `).run(
        ticketId,
        discordId,
        username,
        content,
        Date.now()
    );
}

function getTicketMessages(ticketId) {
    return db.prepare(`
        SELECT
            discord_id,
            username,
            content,
            created_at
        FROM ticket_messages
        WHERE ticket_id = ?
        ORDER BY created_at ASC
    `).all(ticketId);
}

async function sendTicketCloseLog(
    guild,
    ticketId,
    closedBy
) {
    const ticket = getTicket(ticketId);

    if (!ticket) {
        return false;
    }

    const messages = getTicketMessages(ticketId);

    let conversation = messages
        .map(message => {
            const date = new Date(
                message.created_at
            );

            return (
                `**${message.username}** ` +
                `(<t:${Math.floor(date.getTime() / 1000)}:f>)\n` +
                `${message.content}`
            );
        })
        .join("\n\n");

    if (!conversation) {
        conversation = "No messages recorded.";
    }

    if (conversation.length > 4000) {
        conversation =
            conversation.slice(0, 3950) +
            "\n\n...Conversation truncated.";
    }

    const staff =
        ticket.claimer_discord_id
            ? `<@${ticket.claimer_discord_id}>`
            : "Unclaimed";

    const reason =
        ticket.close_reason ||
        "No reason provided";

    const result = await sendLog(
        guild,
        "ticket",
        {
            customer:
                `<@${ticket.owner_discord_id}>`,

            tornAccount:
                "Loss order",

            service:
                "Loss Seller",

            price:
                ticket.price,

            status:
                "Closed",

            ticket:
                `<#${ticket.channel_id}>`,

            staff,

            conversation,

            closed: true,

            closedBy:
                `<@${closedBy}>`,

            closeReason:
                reason
        }
    );

    return result;
}

module.exports = {
    LOSS_RATE,
    calculateLossPrice,
    createLossTicket,
    getTicketByChannel,
    getTicket,
    claimTicket,
    closeTicket,
    saveMessage,
    getTicketMessages,
    sendTicketCloseLog
};
