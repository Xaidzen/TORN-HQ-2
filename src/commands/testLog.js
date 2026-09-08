const {
    SlashCommandBuilder
} = require("discord.js");

const {
    sendLog
} = require("../modules/tornLogger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("testlog")
        .setDescription("Test all TORN HQ logging channels."),

    async execute(interaction) {
        await interaction.deferReply({
            ephemeral: true
        });

        const guild = interaction.guild;

        if (!guild) {
            return interaction.editReply({
                content: "This command can only be used inside a server."
            });
        }

        const discordUser =
            `${interaction.user} (${interaction.user.username})`;

        const results = [];

        /*
         * LOSS LOG
         */
        const lossResult = await sendLog(
            guild,
            "losses",
            {
                tornUsername: "TestPlayer",
                tornId: "1234567",
                discordUser,
                target: "TestTarget [7654321]",
                result: "Lost",
                energyUsed: 25,
                hospitalTime: "25 minutes",
                amount: 300000,
                status: "TEST"
            }
        );

        results.push(
            `Loss Log: ${lossResult ? "✅" : "❌"}`
        );

        /*
         * BOUNTY LOG
         */
        const bountyResult = await sendLog(
            guild,
            "bounties",
            {
                tornUsername: "TestPlayer",
                tornId: "1234567",
                discordUser,
                target: "TestTarget [7654321]",
                amount: 300000,
                anonymous: false,
                status: "TEST"
            }
        );

        results.push(
            `Bounty Log: ${bountyResult ? "✅" : "❌"}`
        );

        /*
         * CONTRACT LOG
         */
        const contractResult = await sendLog(
            guild,
            "contracts",
            {
                tornUsername: "TestPlayer",
                tornId: "1234567",
                discordUser,
                contractType: "Loss Seller",
                target: "TestTarget [7654321]",
                amount: 300000,
                claimer: "Test Claimer",
                status: "TEST"
            }
        );

        results.push(
            `Contract Log: ${contractResult ? "✅" : "❌"}`
        );

        /*
         * PAYMENT LOG
         */
        const paymentResult = await sendLog(
            guild,
            "payments",
            {
                tornUsername: "TestPlayer",
                tornId: "1234567",
                discordUser,
                service: "Loss Seller",
                amount: 325000,
                payer: "Test Payer",
                receiver: "TORN HQ",
                status: "TEST"
            }
        );

        results.push(
            `Payment Log: ${paymentResult ? "✅" : "❌"}`
        );

        /*
         * SERVICE LOG
         */
        const serviceResult = await sendLog(
            guild,
            "services",
            {
                customer: "TestPlayer [1234567]",
                discordUser,
                service: "Loss Seller",
                target: "TestTarget [7654321]",
                staff: "Test Staff",
                price: 300000,
                payment: "TEST",
                status: "TEST",
                notes: "This is a TORN HQ logger test."
            }
        );

        results.push(
            `Service Log: ${serviceResult ? "✅" : "❌"}`
        );

        /*
         * GENERAL LOG
         */
        const generalResult = await sendLog(
            guild,
            "general",
            {
                title: "🧪 TORN HQ Logger Test",
                description:
                    `Logger test performed by ${interaction.user}.`
            }
        );

        results.push(
            `General Log: ${generalResult ? "✅" : "❌"}`
        );

        await interaction.editReply({
            content:
                `**TORN HQ Logger Test Complete**\n\n${results.join("\n")}`
        });
    }
};

Important: fix "tornLogger.js" first

Your current logger has placeholder channel IDs. Replace only the "LOG_CHANNELS" section with this:

:::writing{variant="document" id="74106" title="tornLogger.js channel configuration"}

const LOG_CHANNELS = {
    losses: process.env.LOSS_LOG_CHANNEL_ID,
    bounties: process.env.BOUNTY_LOG_CHANNEL_ID,
    contracts: process.env.CONTRACT_LOG_CHANNEL_ID,
    payments: process.env.PAYMENT_LOG_CHANNEL_ID,
    services: process.env.SERVICE_LOG_CHANNEL_ID,
    general: process.env.GENERAL_LOG_CHANNEL_ID
};

Your ".env" already has the six channel IDs, so do not put the actual IDs inside "testlog.js" or "tornLogger.js".

Then run in Termux

cd ~/TORN-HQ-2
nano src/commands/testlog.js

Paste the first code, save it, then check syntax:

node --check src/commands/testlog.js
node --check src/modules/tornLogger.js

If both show nothing, there is no syntax error.

Then restart your bot and make sure "/testlog" is deployed. Run:

/testlog

You should receive 6 test embeds, one in each configured log channel:

LOSS_LOG_CHANNEL_ID       ✅
BOUNTY_LOG_CHANNEL_ID     ✅
CONTRACT_LOG_CHANNEL_ID   ✅
PAYMENT_LOG_CHANNEL_ID    ✅
SERVICE_LOG_CHANNEL_ID    ✅
GENERAL_LOG_CHANNEL_ID    ✅

The "/testlog" response will also tell you which channels succeeded or failed.
