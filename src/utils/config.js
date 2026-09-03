require("dotenv").config();

function required(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

module.exports = {
    DISCORD_TOKEN: required("DISCORD_TOKEN"),
    CLIENT_ID: required("CLIENT_ID"),
    GUILD_ID: required("GUILD_ID"),

    UNVERIFIED_ROLE_ID: required("UNVERIFIED_ROLE_ID"),
    VERIFIED_ROLE_ID: required("VERIFIED_ROLE_ID"),

    ENTER_VERIFICATION_CHANNEL_ID: required(
        "ENTER_VERIFICATION_CHANNEL_ID"
    ),

    SERVICE_CHANNEL_ID: required("SERVICE_CHANNEL_ID"),
    UNLOCK_SERVICE_CHANNEL_ID: required("UNLOCK_SERVICE_CHANNEL_ID"),
    ORDER_SERVICE_CHANNEL_ID: required("ORDER_SERVICE_CHANNEL_ID"),

    TICKET_CATEGORY_ID: required("TICKET_CATEGORY_ID"),

    LOSS_SELLER_ROLE_ID: required("LOSS_SELLER_ROLE_ID"),
    ESCAPE_SELLER_ROLE_ID: required("ESCAPE_SELLER_ROLE_ID"),
    BOUNTY_PLACER_ROLE_ID: required("BOUNTY_PLACER_ROLE_ID"),
    AGENCY_DETECTIVE_ROLE_ID: required("AGENCY_DETECTIVE_ROLE_ID"),

    STAFF_ROLE_ID: required("STAFF_ROLE_ID"),
    ADMIN_ROLE_ID: required("ADMIN_ROLE_ID"),

    ENCRYPTION_KEY: required("ENCRYPTION_KEY")
};
