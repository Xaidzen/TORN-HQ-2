const axios = require('axios');

const database = require('./database');
const claimTracker = require('./claimTracker');

const TORN_API = 'https://api.torn.com/v2';

async function getAttackLog(apiKey) {
    try {
        const response = await axios.get(
            `${TORN_API}/user/attacks`,
            {
                headers: {
                    Authorization: `ApiKey ${apiKey}`
                },
                params: {
                    limit: 100
                },
                timeout: 10000
            }
        );

        return response.data.attacks || [];
    } catch (error) {
        console.error(
            'Torn attack log error:',
            error.response?.data || error.message
        );

        return [];
    }
}

function isValidLoss(attack, claim) {
    const attackerId =
        attack.attacker?.id ??
        attack.attacker_id;

    const defenderId =
        attack.defender?.id ??
        attack.defender_id;

    const result =
        String(attack.result || '').toLowerCase();

    const attackTime =
        Number(attack.started ?? attack.timestamp ?? attack.time);

    if (String(attackerId) !== String(claim.torn_user_id)) {
        return false;
    }

    if (String(defenderId) !== String(claim.target_id)) {
        return false;
    }

    if (!result.includes('lost')) {
        return false;
    }

    if (!attackTime) {
        return false;
    }

    const attackMilliseconds =
        attackTime < 10000000000
            ? attackTime * 1000
            : attackTime;

    if (attackMilliseconds < claim.started_at) {
        return false;
    }

    if (attackMilliseconds > claim.deadline) {
        return false;
    }

    return true;
}

async function checkClaim(claim) {
    if (Date.now() > claim.deadline) {
        database.prepare(`
            UPDATE claims
            SET status = 'expired'
            WHERE id = ?
            AND status = 'active'
        `).run(claim.id);

        return;
    }

    const apiKeyRow = database.prepare(`
        SELECT api_key
        FROM users
        WHERE torn_user_id = ?
        LIMIT 1
    `).get(claim.torn_user_id);

    if (!apiKeyRow?.api_key) {
        console.log(
            `No API key found for Torn user ${claim.torn_user_id}`
        );

        return;
    }

    const attacks = await getAttackLog(apiKeyRow.api_key);

    for (const attack of attacks) {
        if (!isValidLoss(attack, claim)) {
            continue;
        }

        const attackId =
            attack.id ??
            attack.attack_id;

        if (!attackId) {
            continue;
        }

        const updatedClaim =
            claimTracker.addCompletedLoss(
                claim.id,
                attackId
            );

        if (!updatedClaim) {
            continue;
        }

        console.log(
            `Claim #${updatedClaim.id}: ` +
            `${updatedClaim.amount_completed}/` +
            `${updatedClaim.amount_claimed}`
        );

        if (
            updatedClaim.status === 'completed'
        ) {
            console.log(
                `Claim #${updatedClaim.id} completed.`
            );
        }
    }
}

async function checkAllClaims() {
    const claims = claimTracker.getActiveClaims();

    for (const claim of claims) {
        await checkClaim(claim);
    }
}

function startTracker() {
    console.log('Torn attack tracker started.');

    checkAllClaims();

    setInterval(() => {
        checkAllClaims().catch(error => {
            console.error(
                'Attack tracker error:',
                error
            );
        });
    }, 15000);
}

module.exports = {
    getAttackLog,
    checkClaim,
    checkAllClaims,
    startTracker
};
