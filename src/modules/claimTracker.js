const contractSystem = require('./contractSystem');

const CHECK_INTERVAL = 10 * 1000;

function startClaimTracker(client) {
    setInterval(async () => {
        try {
            const data = contractSystem.loadData();
        const now = Date.now();

            for (const claim of data.claims) {
                if (!['active', 'tracking'].includes(claim.status)) {
                    continue;
                }

                if (now >= claim.deadline) {
                    claim.status = 'expired';
                    claim.expiredAt = now;

                    const contract = data.contracts.find(
                        c => c.id === claim.contractId
                    );

                    if (contract) {
                        const unfinished =
                            claim.amountClaimed -
                            claim.completedLosses;

                        contract.availableLosses += unfinished;
                    }

                    try {
                        const user = await client.users.fetch(
                            claim.userId
                        );

                        await user.send({
                            embeds: [{
                                color: 0xe74c3c,
                                title: `Loss Claim Expired #${claim.claimNumber}`,
                                description:
                                    `Your claim **${claim.id}** has expired.\n\n` +
                                    `Completed: **${claim.completedLosses}/${claim.amountClaimed}**`
                            }]
                        });
                    } catch {}
                }
            }

            contractSystem.saveData(data);
        } catch (error) {
            console.error('[CLAIM TRACKER]', error);
        }
    }, CHECK_INTERVAL);
}

function getClaimProgress(claimId) {
    return contractSystem.getClaim(claimId);
}

module.exports = {
    startClaimTracker,
    getClaimProgress
};
