const config = require("../utils/config");

const SERVICE_ROLES = {
    service_loss: config.LOSS_SELLER_ROLE_ID,
    service_escape: config.ESCAPE_SELLER_ROLE_ID,
    service_bounty: config.BOUNTY_PLACER_ROLE_ID,
    service_detective: config.AGENCY_DETECTIVE_ROLE_ID
};

async function giveServiceRole(member, buttonId) {
    const roleId = SERVICE_ROLES[buttonId];

    if (!roleId) {
        return false;
    }

    await member.roles.add(roleId);

    return true;
}

module.exports = {
    giveServiceRole
};
