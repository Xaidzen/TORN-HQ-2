const {
    Events,
    ModalBuilder,
    LabelBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const {
    saveVerifiedUser,
    isVerified
} = require('../modules/database');

const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const UNVERIFIED_ROLE_ID = process.env.UNVERIFIED_ROLE_ID;

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        try {
            /*
             * =========================
             * SLASH COMMANDS
             * =========================
             */

            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(
                    interaction.commandName
                );

                if (!command) return;

                await command.execute(interaction);
                return;
            }

            /*
             * =========================
             * BUTTONS
             * =========================
             */

            if (interaction.isButton()) {

                /*
                 * ADD KEY
                 */

                if (interaction.customId === 'verify_add_key') {

                    const modal = new ModalBuilder()
                        .setCustomId('verify_api_key_modal')
                        .setTitle('Torn HQ Verification');

                    const warning = new LabelBuilder()
                        .setLabel('⚠️ Do not add your personal information.')
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId('torn_api_key')
                                .setPlaceholder('Paste your Torn API key here')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setMinLength(16)
                                .setMaxLength(16)
                        );

                    modal.addLabelComponents(warning);

                    await interaction.showModal(modal);
                    return;
                }

                /*
                 * YES
                 */

                if (interaction.customId === 'verification_yes') {

                    if (!isVerified(interaction.user.id)) {
                        await interaction.reply({
                            content: 'You must be verified to use this button.',
                            ephemeral: true
                        });

                        return;
                    }

                    const channelsEmbed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(
                            [
                                '**TORN HQ SERVER CHANNELS**',
                                '',
                                'Channel links and descriptions will be added here.'
                            ].join('\n')
                        );

                    await interaction.update({
                        embeds: [channelsEmbed],
                        components: []
                    });

                    return;
                }

                /*
                 * NO
                 */

                if (interaction.customId === 'verification_no') {

                    if (!isVerified(interaction.user.id)) {
                        await interaction.reply({
                            content: 'You must be verified to use this button.',
                            ephemeral: true
                        });

                        return;
                    }

                    await interaction.update({
                        content: `Have Fun ${interaction.user}! ☺️`,
                        embeds: [],
                        components: []
                    });

                    return;
                }

                /*
                 * EXAMPLE OF A PROTECTED BUTTON
                 *
                 * Later, any button that requires verification
                 * can use this same check.
                 */

                if (interaction.customId.startsWith('verified_')) {

                    if (!isVerified(interaction.user.id)) {
                        await interaction.reply({
                            content: 'You must be verified to use this button.',
                            ephemeral: true
                        });

                        return;
                    }

                    // Your protected button code goes here.
                    return;
                }

                return;
            }

            /*
             * =========================
             * API KEY MODAL
             * =========================
             */

            if (interaction.isModalSubmit()) {

                if (interaction.customId !== 'verify_api_key_modal') {
                    return;
                }

                const apiKey = interaction.fields
                    .getTextInputValue('torn_api_key')
                    .trim();

                /*
                 * Basic format check before contacting Torn.
                 */

                if (!/^[a-zA-Z0-9]{16}$/.test(apiKey)) {

                    await interaction.reply({
                        content: 'Your key is not valid. Please try again.',
                        ephemeral: true
                    });

                    return;
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                /*
                 * Ask Torn for information about the key.
                 *
                 * We do NOT save the key.
                 */

                const url =
                    `https://api.torn.com/key/?selections=info&key=${encodeURIComponent(apiKey)}`;

                const response = await fetch(url);

                if (!response.ok) {
                    await interaction.editReply({
                        content: 'Torn API could not be reached. Please try again later.'
                    });

                    return;
                }

                const data = await response.json();

                /*
                 * Torn error.
                 */

                if (data.error) {

                    if (data.error.code === 2) {
                        await interaction.editReply({
                            content: 'Your key is not valid. Please try again.'
                        });

                        return;
                    }

                    if (data.error.code === 5) {
                        await interaction.editReply({
                            content: 'Too many requests were made to Torn. Please try again later.'
                        });

                        return;
                    }

                    if (data.error.code === 8) {
                        await interaction.editReply({
                            content: 'Torn temporarily blocked this API request. Please try again later.'
                        });

                        return;
                    }

                    await interaction.editReply({
                        content: 'The Torn API could not verify this key. Please try again later.'
                    });

                    return;
                }

                /*
                 * Torn's key info contains the owner.
                 */

                const tornId =
                    data?.user?.id ??
                    data?.user?.user_id ??
                    data?.user_id;

                if (!tornId) {
                    await interaction.editReply({
                        content: 'The key was valid, but Torn did not return the account owner. Please try again.'
                    });

                    return;
                }

                /*
                 * Prevent duplicate Torn account linking.
                 */

                const saved = saveVerifiedUser(
                    interaction.user.id,
                    String(tornId)
                );

                if (!saved.success) {

                    if (saved.reason === 'discord_already_verified') {
                        await interaction.editReply({
                            content: 'You are already verified.'
                        });

                        return;
                    }

                    if (saved.reason === 'torn_account_already_linked') {
                        await interaction.editReply({
                            content: 'This Torn account is already linked to another Discord account.'
                        });

                        return;
                    }

                    await interaction.editReply({
                        content: 'Verification could not be completed. Please try again.'
                    });

                    return;
                }

                /*
                 * =========================
                 * ROLE MANAGEMENT
                 * =========================
                 */

                const member = interaction.member;

                if (!member) {
                    await interaction.editReply({
                        content: 'I could not find your server membership.'
                    });

                    return;
                }

                if (UNVERIFIED_ROLE_ID) {
                    await member.roles.remove(UNVERIFIED_ROLE_ID)
                        .catch(() => {});
                }

                if (VERIFIED_ROLE_ID) {
                    await member.roles.add(VERIFIED_ROLE_ID)
                        .catch(() => {});
                }

                /*
                 * =========================
                 * SUCCESS
                 * =========================
                 */

                const successEmbed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(
                        `**Verified Success.** Thank you ${interaction.user} for joining Torn HQ!\n\n` +
                        'Do you want me to guide you to the server channels?'
                    );

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('verification_yes')
                            .setLabel('Yes')
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId('verification_no')
                            .setLabel('No')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.editReply({
                    content: '',
                    embeds: [successEmbed],
                    components: [buttons]
                });

                return;
            }

        } catch (error) {
            console.error('Interaction error:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Something went wrong. Please try again later.',
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.editReply({
                    content: 'Something went wrong. Please try again later.'
                }).catch(() => {});
            }
        }
    }
};
