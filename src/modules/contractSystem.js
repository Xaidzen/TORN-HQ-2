const {
    EmbedBuilder
} = require('discord.js');

const database = require('./database');

function createLossContract({
    guildId,
    channelId,
    targetId,
    targetName,
    totalLosses,
    payout
}) {
    const stmt = database.prepare(`
        INSERT INTO contracts (
            guild_id,
            type,
            channel_id,
            target_id,
            target_name,
            total_amount,
            available_amount,
            payout,
            status,
            created_at
        )
        VALUES (?, 'loss', ?, ?, ?, ?, ?, ?, 'open', ?)
    `);

    const result = stmt.run(
        guildId,
        channelId,
        targetId,
        targetName || null,
        totalLosses,
        totalLosses,
        payout,
        Date.now()
    );

    return getContract(result.lastInsertRowid);
}

function getContract(id) {
    return database.prepare(`
        SELECT *
        FROM contracts
        WHERE id = ?
    `).get(id);
}

function getAvailableContract(guildId, type) {
    return database.prepare(`
        SELECT *
        FROM contracts
        WHERE guild_id = ?
        AND type = ?
        AND status = 'open'
        AND available_amount > 0
        ORDER BY id ASC
        LIMIT 1
    `).get(guildId, type);
}

function createLossEmbed(contract) {
    return new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Loss Contract')
        .setDescription(
            `${contract.available_amount}+ losses available.\n` +
            `Please use pillow or plastic sword when attacking buyers.`
        );
}

function updateAvailableAmount(contractId, amount) {
    database.prepare(`
        UPDATE contracts
        SET available_amount = ?
        WHERE id = ?
    `).run(amount, contractId);
}

function closeContractIfEmpty(contractId) {
    const contract = getContract(contractId);

    if (!contract) return;

    if (contract.available_amount <= 0) {
        database.prepare(`
            UPDATE contracts
            SET status = 'claimed'
            WHERE id = ?
        `).run(contractId);
    }
}

function returnLosses(contractId, amount) {
    const contract = getContract(contractId);

    if (!contract) return false;

    const newAmount = contract.available_amount + amount;

    database.prepare(`
        UPDATE contracts
        SET available_amount = ?,
            status = 'open'
        WHERE id = ?
    `).run(newAmount, contractId);

    return true;
}

module.exports = {
    createLossContract,
    getContract,
    getAvailableContract,
    createLossEmbed,
    updateAvailableAmount,
    closeContractIfEmpty,
    returnLosses
};
