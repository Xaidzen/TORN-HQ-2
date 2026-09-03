const config = require("../utils/config");

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {
        try {
            await member.roles.add(
                config.UNVERIFIED_ROLE_ID
            );
        } catch (error) {
            console.error(
                "Could not give UNVERIFIED role:",
                error
            );
        }
    }
};
