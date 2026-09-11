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
