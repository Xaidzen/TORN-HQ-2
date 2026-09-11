const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const CONTRACT_FILE = path.join(DATA_DIR, 'contracts.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CONTRACT_FILE)) {
    fs.writeFileSync(CONTRACT_FILE, JSON.stringify({
        contracts: [],
        claims: []
    }, null, 2));
}

function loadData() {
    try {
        return JSON.parse(fs.readFileSync(CONTRACT_FILE, 'utf8'));
    } catch {
        return {
            contracts: [],
            claims: []
        };
    }
}

function saveData(data) {
    fs.writeFileSync(
        CONTRACT_FILE,
        JSON.stringify(data, null, 2)
    );
}

function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function createLossContract({
    targetId,
    totalLosses,
    payoutPerLoss,
    ticketId,
    createdBy
}) {
    if (!targetId) {
        throw new Error('Target ID is required.');
    }

    if (!Number.isInteger(totalLosses) || totalLosses < 1) {
        throw new Error('Invalid loss amount.');
    }

    const data = loadData();

    const contract = {
        id: generateId('L'),
        targetId: String(targetId),
        targetLink: `https://www.torn.com/profiles.php?XID=${targetId}`,
        totalLosses,
        availableLosses: totalLosses,
        payoutPerLoss,
        ticketId: ticketId || null,
        createdBy,
        createdAt: Date.now(),
        status: 'active'
    };

    data.contracts.push(contract);
    saveData(data);

    return contract;
}

function getContract(contractId) {
    const data = loadData();

    return data.contracts.find(
        contract => contract.id === contractId
    );
}

function getActiveLossContracts() {
    const data = loadData();

    return data.contracts.filter(
        contract =>
            contract.status === 'active' &&
            contract.availableLosses > 0
    );
}

function claimLosses(contractId, userId, amount) {
    const data = loadData();

    const contract = data.contracts.find(
        c => c.id === contractId
    );

    if (!contract) {
        throw new Error('Contract not found.');
    }

    if (contract.status !== 'active') {
        throw new Error('This contract is no longer active.');
    }

    if (!Number.isInteger(amount) || amount < 1 || amount > 40) {
        throw new Error('You can only claim between 1 and 40 losses.');
    }

    if (amount > contract.availableLosses) {
        throw new Error(
            `Only ${contract.availableLosses} losses are currently available.`
        );
    }

    const existingClaim = data.claims.find(
        claim =>
            claim.contractId === contractId &&
            claim.userId === userId &&
            ['active', 'tracking'].includes(claim.status)
    );

    if (existingClaim) {
        throw new Error(
            'You already have an active claim for this contract.'
        );
    }

    contract.availableLosses -= amount;

    const claim = {
        id: generateId('C'),
        claimNumber: data.claims.length + 1,
        contractId: contract.id,
        userId,
        targetId: contract.targetId,
        targetLink: contract.targetLink,

        amountClaimed: amount,
        completedLosses: 0,

        payoutPerLoss: contract.payoutPerLoss,
        payout: amount * contract.payoutPerLoss,

        createdAt: Date.now(),
        deadline: Date.now() + (30 * 60 * 1000),

        status: 'active'
    };

    data.claims.push(claim);

    saveData(data);

    return claim;
}

function unclaimLosses(claimId, userId) {
    const data = loadData();

    const claim = data.claims.find(
        c =>
            c.id === claimId &&
            c.userId === userId
    );

    if (!claim) {
        throw new Error('Claim not found.');
    }

    if (!['active', 'tracking'].includes(claim.status)) {
        throw new Error('This claim cannot be unclaimed.');
    }

    const contract = data.contracts.find(
        c => c.id === claim.contractId
    );

    if (contract) {
        const remaining =
            claim.amountClaimed - claim.completedLosses;

        contract.availableLosses += remaining;
    }

    claim.status = 'unclaimed';
    claim.unclaimedAt = Date.now();

    saveData(data);

    return claim;
}

function getClaim(claimId) {
    const data = loadData();

    return data.claims.find(
        claim => claim.id === claimId
    );
}

function getUserActiveClaims(userId) {
    const data = loadData();

    return data.claims.filter(
        claim =>
            claim.userId === userId &&
            ['active', 'tracking'].includes(claim.status)
    );
}

function updateClaimProgress(claimId, completedLosses) {
    const data = loadData();

    const claim = data.claims.find(
        c => c.id === claimId
    );

    if (!claim) {
        return null;
    }

    claim.completedLosses = Math.min(
        completedLosses,
        claim.amountClaimed
    );

    claim.status =
        claim.completedLosses >= claim.amountClaimed
            ? 'completed'
            : 'tracking';

    if (claim.status === 'completed') {
        claim.completedAt = Date.now();
    }

    saveData(data);

    return claim;
}

function buildContractEmbed(contract) {
    return new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('Loss Contract')
        .setDescription(
            `**${contract.availableLosses} losses available.**\n\n` +
            `Reminder: Use only pillow or plastic sword when attacking the buyer.`
        )
        .addFields(
            {
                name: 'Target',
                value: `[${contract.targetId}](${contract.targetLink})`,
                inline: true
            },
            {
                name: 'Payout Per Loss',
                value: `$${contract.payoutPerLoss.toLocaleString()}`,
                inline: true
            },
            {
                name: 'Contract ID',
                value: `\`${contract.id}\``,
                inline: true
            }
        )
        .setFooter({
            text: `Contract ${contract.id}`
        });
}

function buildContractButtons(contractId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`loss_claim:${contractId}`)
            .setLabel('Claim')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`loss_unclaim:${contractId}`)
            .setLabel('Unclaim')
            .setStyle(ButtonStyle.Danger)
    );
}

module.exports = {
    loadData,
    saveData,
    createLossContract,
    getContract,
    getActiveLossContracts,
    claimLosses,
    unclaimLosses,
    getClaim,
    getUserActiveClaims,
    updateClaimProgress,
    buildContractEmbed,
    buildContractButtons
};
