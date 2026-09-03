const config = require("./config");

function isAdmin(member) {
    return Boolean(
        member &&
        (
            member.permissions.has("Administrator") ||
            member.roles.cache.has(config.ADMIN_ROLE_ID)
        )
    );
}

function isStaff(member) {
    return Boolean(
        member &&
        (
            member.permissions.has("Administrator") ||
            member.roles.cache.has(config.ADMIN_ROLE_ID) ||
            member.roles.cache.has(config.STAFF_ROLE_ID)
        )
    );
}

module.exports = {
    isAdmin,
    isStaff
};
