const contractSystem = require('./contractSystem');

const TORN_API = 'https://api.torn.com/v2';

const POLL_INTERVAL = 15000;

async function tornRequest(apiKey, endpoint) {
    const url =
        `${TORN_API}${endpoint}` +
        `&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Torn API HTTP ${response.status}`
        );
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(
            `Torn API ${data.error.code}: ${data.error.error}`
        );
    }

    return data;
}

/*
 * Connect this function to your existing verification database.
 *
 * It must return the verified user's Torn API key.
 */
async function getUserApiKey(userId) {
    /*
     * Replace this with your existing database function.
     *
     * Example:
     *
     * const database = require('./database');
     * return database.getApiKey(userId);
     */

    return null;
}

async function getAttackLog(apiKey) {
    /*
     * Torn user attack log.
     *
     * The API response is expected to contain the user's
     * recent attacks.
     */
    return tornRequest(
        apiKey,
        '/user/?selections=attacklog'
    );
}

function isLossAgainstTarget(attack, targetId) {
    if (!attack) {
        return false;
    }

    const defenderId =
        String(
            attack.defender_id ??
            attack.defender?.id ??
            attack.target_id ??
            ''
        );

    if (defenderId !== String(targetId)) {
        return false;
    }

    const result = String(
        attack.result ??
        attack.result_text ??
        attack.outcome ??
        ''
    ).toLowerCase();

    return (
        result.includes('lost') ||
        result.includes('loss') ||
        result.includes('lost the attack')
    );
}

function usesAllowedWeapon(attack) {
    const weapon = String(
        attack.weapon_name ??
        attack.weapon ??
        ''
    ).toLowerCase();

    return (
        weapon.includes('pillow') ||
        weapon.includes('plastic sword')
    );
}

async function checkClaim(claim) {
    const apiKey = await getUserApiKey(
        claim.userId
    );

    if (!apiKey) {
        return;
    }

    const response = await getAttackLog(apiKey);

    const attacks =
        response.attacks ||
        response.attacklog ||
        [];

    let qualifyingLosses = 0;

    for (const attack of attacks) {
        if (!isLossAgainstTarget(
            attack,
            claim.targetId
        )) {
            continue;
        }

        if (!usesAllowedWeapon(attack)) {
            continue;
        }

        qualifyingLosses++;
    }

    if (qualifyingLosses <= claim.completedLosses) {
        return;
    }

    const newProgress =
        Math.min(
            qualifyingLosses,
            claim.amountClaimed
        );

    const updated =
        contractSystem.updateClaimProgress(
            claim.id,
            newProgress
        );

    return updated;
}

async function checkAllActiveClaims() {
    const data = contractSystem.loadData();

    const activeClaims = data.claims.filter(
        claim =>
            ['active', 'tracking'].includes(
                claim.status
            )
    );

    for (const claim of activeClaims) {
        try {
            await checkClaim(claim);
        } catch (error) {
            console.error(
                `[TORN ATTACK TRACKER] ${claim.id}`,
                error.message
            );
        }
    }
}

function startTornAttackTracker() {
    console.log(
        '[TORN ATTACK TRACKER] Started.'
    );

    setInterval(
        checkAllActiveClaims,
        POLL_INTERVAL
    );
}

module.exports = {
    startTornAttackTracker,
    checkClaim,
    getAttackLog,
    getUserApiKey
};
