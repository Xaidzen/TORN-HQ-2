const {
    EmbedBuilder
} = require("discord.js");

/*
 * TORN HQ LOG CHANNELS
 *
 * Replace the values with your Discord channel IDs.
 */

const LOG_CHANNELS = {
    losses: "LOSS_CHANNEL_ID",
    bounties: "BOUNTY_CHANNEL_ID",
    contracts: "CONTRACT_CHANNEL_ID",
    payments: "PAYMENT_CHANNEL_ID",
    services: "SERVICE_CHANNEL_ID",
    general: "GENERAL_LOG_CHANNEL_ID"
};


/*
 * Get a Discord channel safely.
 */
async function getChannel(guild, channelId) {
    if (!guild || !channelId) {
        return null;
    }

    try {
        return await guild.channels.fetch(channelId);
    } catch (error) {
        console.error(
            "Unable to fetch log channel:",
            error
        );

        return null;
    }
}


/*
 * Send a TORN HQ log.
 */
async function sendLog(
    guild,
    type,
    data = {}
) {
    const channelId =
        LOG_CHANNELS[type] ||
        LOG_CHANNELS.general;

    const channel =
        await getChannel(
            guild,
            channelId
        );

    if (!channel) {
        return false;
    }

    const embed =
        new EmbedBuilder()
            .setTimestamp();

    /*
     * LOSS
     */
    if (type === "losses") {

        embed
            .setTitle("⚔️ Loss Log")
            .setDescription(
                `**${data.tornUsername || "Unknown"} [${data.tornId || "Unknown"}]**`
            )
            .addFields(
                {
                    name: "Discord User",
                    value: data.discordUser || "Unknown",
                    inline: true
                },
                {
                    name: "Target",
                    value: data.target || "Unknown",
                    inline: true
                },
                {
                    name: "Result",
                    value: data.result || "Lost",
                    inline: true
                },
                {
                    name: "Energy Used",
                    value: `${data.energyUsed ?? "N/A"}`,
                    inline: true
                },
                {
                    name: "Hospital Time",
                    value: data.hospitalTime || "None",
                    inline: true
                },
                {
                    name: "Amount",
                    value: data.amount
                        ? `$${Number(data.amount).toLocaleString()}`
                        : "N/A",
                    inline: true
                },
                {
                    name: "Status",
                    value: data.status || "Completed",
                    inline: true
                }
            );

        if (data.logUrl) {
            embed.addFields({
                name: "Torn Log",
                value: `[View Log](${data.logUrl})`,
                inline: false
            });
        }
    }


    /*
     * BOUNTY
     */
    else if (type === "bounties") {

        embed
            .setTitle("🎯 Bounty Log")
            .setDescription(
                `**${data.tornUsername || "Unknown"} [${data.tornId || "Unknown"}]**`
            )
            .addFields(
                {
                    name: "Discord User",
                    value: data.discordUser || "Unknown",
                    inline: true
                },
                {
                    name: "Target",
                    value: data.target || "Unknown",
                    inline: true
                },
                {
                    name: "Amount",
                    value: data.amount
                        ? `$${Number(data.amount).toLocaleString()}`
                        : "N/A",
                    inline: true
                },
                {
                    name: "Type",
                    value: data.anonymous
                        ? "Anonymous"
                        : "Public",
                    inline: true
                },
                {
                    name: "Status",
                    value: data.status || "Pending",
                    inline: true
                }
            );
    }


    /*
     * CONTRACT
     */
    else if (type === "contracts") {

        embed
            .setTitle("📜 Contract Log")
            .setDescription(
                `**${data.tornUsername || "Unknown"} [${data.tornId || "Unknown"}]**`
            )
            .addFields(
                {
                    name: "Discord User",
                    value: data.discordUser || "Unknown",
                    inline: true
                },
                {
                    name: "Contract Type",
                    value: data.contractType || "Unknown",
                    inline: true
                },
                {
                    name: "Target",
                    value: data.target || "Unknown",
                    inline: true
                },
                {
                    name: "Amount",
                    value: data.amount
                        ? `$${Number(data.amount).toLocaleString()}`
                        : "N/A",
                    inline: true
                },
                {
                    name: "Claimer",
                    value: data.claimer || "Unclaimed",
                    inline: true
                },
                {
                    name: "Status",
                    value: data.status || "Pending",
                    inline: true
                }
            );
    }


    /*
     * PAYMENT
     */
    else if (type === "payments") {

        embed
            .setTitle("💰 Payment Log")
            .setDescription(
                `**${data.tornUsername || "Unknown"} [${data.tornId || "Unknown"}]**`
            )
            .addFields(
                {
                    name: "Discord User",
                    value: data.discordUser || "Unknown",
                    inline: true
                },
                {
                    name: "Service",
                    value: data.service || "Unknown",
                    inline: true
                },
                {
                    name: "Amount",
                    value: data.amount
                        ? `$${Number(data.amount).toLocaleString()}`
                        : "N/A",
                    inline: true
                },
                {
                    name: "Payer",
                    value: data.payer || "Unknown",
                    inline: true
                },
                {
                    name: "Receiver",
                    value: data.receiver || "Unknown",
                    inline: true
                },
                {
                    name: "Status",
                    value: data.status || "Paid",
                    inline: true
                }
            );
    }


    /*
     * SERVICE
     */
    else if (type === "services") {

        embed
            .setTitle("🛠️ Service Log")
            .setDescription(
                `**${data.customer || "Unknown"}**`
            )
            .addFields(
                {
                    name: "Discord User",
                    value: data.discordUser || "Unknown",
                    inline: true
                },
                {
                    name: "Service",
                    value: data.service || "Unknown",
                    inline: true
                },
                {
                    name: "Target",
                    value: data.target || "None",
                    inline: true
                },
                {
                    name: "Staff",
                    value: data.staff || "Unknown",
                    inline: true
                },
                {
                    name: "Price",
                    value: data.price
                        ? `$${Number(data.price).toLocaleString()}`
                        : "N/A",
                    inline: true
                },
                {
                    name: "Payment",
                    value: data.payment || "Pending",
                    inline: true
                },
                {
                    name: "Status",
                    value: data.status || "Pending",
                    inline: true
                }
            );

        if (data.notes) {
            embed.addFields({
                name: "Notes",
                value: data.notes,
                inline: false
            });
        }
    }


    /*
     * GENERAL
     */
    else {

        embed
            .setTitle(
                data.title || "TORN HQ Log"
            )
            .setDescription(
                data.description || "No information."
            );
    }

    try {
        await channel.send({
            embeds: [embed]
        });

        return true;

    } catch (error) {
        console.error(
            "Unable to send TORN HQ log:",
            error
        );

        return false;
    }
}


module.exports = {
    LOG_CHANNELS,
    sendLog
};
