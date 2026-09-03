const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

function verificationEmbed() {
    return new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(
            "**TORN HQ VERIFICATION**\n\n" +
            "1. Click the link below.\n\n" +
            "2. A key will appear and copy it.\n\n" +
            "3. Paste the key in the Add Key below."
        );
}

function verificationButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel("Custom API Key")
            .setStyle(ButtonStyle.Link)
            .setURL(
                "https://www.torn.com/preferences.php#tab=api?step=addNewKey&user=faction,basic,bounties,discord,personalstats,profile,cooldowns,crimes&torn=attacklog,bounties,crimes&title=Torn%20HQ"
            ),

        new ButtonBuilder()
            .setCustomId("verify_add_key")
            .setLabel("Add Key / Update Key")
            .setStyle(ButtonStyle.Primary)
    );
}

function serviceEmbed() {
    return new EmbedBuilder()
        .setTitle("Torn HQ Service")
        .setDescription("N/A");
}

function serviceButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("service_loss")
            .setLabel("Loss Seller 🔫")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("service_escape")
            .setLabel("Escape Seller 🏃🏻")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("service_bounty")
            .setLabel("Bounty Placer 🎯")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("service_detective")
            .setLabel("Agency Detective 🕵🏻")
            .setStyle(ButtonStyle.Primary)
    );
}

function orderEmbed() {
    return new EmbedBuilder()
        .setTitle("Torn HQ Order Service")
        .setDescription(
            "Please click the button below what you want to order " +
            "and patiently wait for the staff to claim the order."
        );
}

function orderButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("order_losses")
            .setLabel("Order Losses")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("order_escapes")
            .setLabel("Order Escapes")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("order_bounties")
            .setLabel("Order Bounties")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("order_detective")
            .setLabel("Order Detective")
            .setStyle(ButtonStyle.Primary)
    );
}

module.exports = {
    verificationEmbed,
    verificationButtons,
    serviceEmbed,
    serviceButtons,
    orderEmbed,
    orderButtons
};
