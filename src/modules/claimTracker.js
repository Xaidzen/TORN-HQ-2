const {
    EmbedBuilder
} = require('discord.js');

const database = require('./database');
const contractSystem = require('./contractSystem');

function createClaim({
    contractId,
    guildId,
    discordUserId,
    tornUserId,
    targetId,
    amount,
    payout
}) {
    const contract = contractSystem.getContract(contractId);

    if (!contract) {
        throw new Error('Contract not found.');
    }

    if (contract.status !== 'open') {
        throw new Error('This contract is no longer available.');
    }

    if (amount < 1 || amount > 40) {
        throw new Error('You can only claim between 1 and 40 losses.');
    }

    if (amount > contract.available_amount) {
        throw new Error(
            `Only ${contract.available_amount} losses are currently available.`
        );
    }

    const claimId = database.transaction(() => {
        const newAvailable = contract.available_amount - amount;

        contractSystem.updateAvailableAmount(
            contractId,
            newAvailable
        );

        const result = database.prepare(`
            INSERT INTO claims (
                contract_id,
                guild_id,
                discord_user_id,
                torn_user_id,
                target_id,
                amount_claimed,
                amount_completed,
                payout,
                started_at,
                deadline,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'active')
        `).run(
            contractId,
            guildId,
            discordUserId,
            tornUserId,
            targetId,
            amount,
            payout,
            Date.now(),
            Date.now() + (30 * 60 * 1000)
        );

        contractSystem.closeContractIfEmpty(contractId);

        return result.lastInsertRowid;
    })();

    return getClaim(claimId);
}

function getClaim(id) {
    return database.prepare(`
        SELECT *
        FROM claims
        WHERE id = ?
    `).get(id);
}

function getActiveClaimForUser(discordUserId, contractId) {
    return database.prepare(`
        SELECT *
        FROM claims
        WHERE discord_user_id = ?
        AND contract_id = ?
        AND status = 'active'
        LIMIT 1
    `).get(discordUserId, contractId);
}

function getActiveClaims() {
    return database.prepare(`
        SELECT *
        FROM claims
        WHERE status = 'active'
    `).all();
}

function addCompletedLoss(claimId, attackId) {
    const claim = getClaim(claimId);

    if (!claim || claim.status !== 'active') {
        return null;
    }

    if (claim.amount_completed >= claim.amount_claimed) {
        return claim;
    }

    const alreadyTracked = database.prepare(`
        SELECT id
        FROM claim_attacks
        WHERE claim_id = ?
        AND attack_id = ?
        LIMIT 1
    `).get(claimId, String(attackId));

    if (alreadyTracked) {
        return claim;
    }

    database.prepare(`
        INSERT INTO claim_attacks (
            claim_id,
            attack_id,
            created_at
        )
        VALUES (?, ?, ?)
    `).run(
        claimId,
        String(attackId),
        Date.now()
    );

    const newCompleted = claim.amount_completed + 1;

    database.prepare(`
        UPDATE claims
        SET amount_completed = ?,
            status = ?
        WHERE id = ?
    `).run(
        newCompleted,
        newCompleted >= claim.amount_claimed
            ? 'completed'
            : 'active',
        claimId
    );

    return getClaim(claimId);
}

function unclaim(claimId, discordUserId) {
    const claim = database.prepare(`
        SELECT *
        FROM claims
        WHERE id = ?
        AND discord_user_id = ?
        AND status = 'active'
    `).get(claimId, discordUserId);

    if (!claim) {
        return null;
    }

    const remaining = claim.amount_claimed - claim.amount_completed;

    database.transaction(() => {
        if (remaining > 0) {
            contractSystem.returnLosses(
                claim.contract_id,
                remaining
            );
        }

        database.prepare(`
            UPDATE claims
            SET status = 'unclaimed'
            WHERE id = ?
        `).run(claimId);
    })();

    return claim;
}

function createClaimEmbed(claim, contract) {
    return new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`Losses Claimed #${claim.id}`)
        .setDescription(
            `You have claimed ${claim.amount_claimed} losses on L#${contract.id}.\n\n` +

            `🎯 Target ID: ${claim.target_id}\n` +
            `🎯 Target Link: https://www.torn.com/profiles.php?XID=${claim.target_id}\n` +
            `Losses Claimed: ${claim.amount_claimed}\n` +
            `Payout: $${Number(claim.payout).toLocaleString()}\n\n` +

            `⏱️ You have 30 minutes to complete the losses. ` +
            `The bot will automatically track your attacks.\n\n` +

            `Claim ID: #${claim.id}`
        );
}

module.exports = {
    createClaim,
    getClaim,
    getActiveClaimForUser,
    getActiveClaims,
    addCompletedLoss,
    unclaim,
    createClaimEmbed
};
