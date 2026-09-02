const {
    Events,
    ModalBuilder,
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

const VERIFIED_ROLE_ID =
    process.env.VERIFIED_ROLE_ID;

const UNVERIFIED_ROLE_ID =
    process.env.UNVERIFIED_ROLE_ID;

const VERIFICATION_CHANNEL_ID =
    process.env.VERIFICATION_CHANNEL_ID;

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        try {

            /*
             * =====================================
             * SLASH COMMANDS
             * =====================================
             */

            if (interaction.isChatInputCommand()) {

                const command =
                    interaction.client.commands.get(
                        interaction.commandName
                    );

                if (!command) return;

                if (
                    interaction.commandName !== 'verify' &&
                    !isVerified(interaction.user.id)
                ) {
                    await interaction.reply({
                        content:
                            'You must be verified to use this command.',
                        ephemeral: true
                    });

                    return;
                }

                await command.execute(interaction);

                return;
            }

            /*
             * =====================================
             * BUTTONS
             * =====================================
             */

            if (interaction.isButton()) {

                if (
                    interaction.customId ===
                    'verify_add_key'
                ) {

                    if (
                        VERIFICATION_CHANNEL_ID &&
                        interaction.channelId !==
                        VERIFICATION_CHANNEL_ID
                    ) {
                        await interaction.reply({
                            content:
                                'You can only use verification buttons in the #Enter Verification channel.',
                            ephemeral: true
                        });

                        return;
                    }

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                'verify_api_key_modal'
                            )
                            .setTitle(
                                'Torn HQ Verification'
                            );

                    const keyInput =
                        new TextInputBuilder()
                            .setCustomId(
                                'torn_api_key'
                            )
                            .setLabel(
                                'API Key'
                            )
                            .setPlaceholder(
                                'Paste your Torn API key here'
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMinLength(16)
                            .setMaxLength(16);

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(keyInput)
                    );

                    await interaction.showModal(
                        modal
                    );

                    return;
                }

                /*
                 * =================================
                 * YES
                 * =================================
                 */

                if (
                    interaction.customId ===
                    'verification_yes'
                ) {

                    if (
                        !isVerified(
                            interaction.user.id
                        )
                    ) {
                        await interaction.reply({
                            content:
                                'You must be verified to use this button.',
                            ephemeral: true
                        });

                        return;
                    }

                    const channelsEmbed =
                        new EmbedBuilder()
                            .setColor(0x57F287)
                            .setDescription(
                                [
                                    '**TORN HQ SERVER CHANNELS**',
                                    '',
                                    'Channel links and descriptions will be added here.'
                                ].join('\n')
                            );

                    await interaction.update({
                        embeds: [
                            channelsEmbed
                        ],
                        components: []
                    });

                    return;
                }

                /*
                 * =================================
                 * NO
                 * =================================
                 */

                if (
                    interaction.customId ===
                    'verification_no'
                ) {

                    if (
                        !isVerified(
                            interaction.user.id
                        )
                    ) {
                        await interaction.reply({
                            content:
                                'You must be verified to use this button.',
                            ephemeral: true
                        });

                        return;
                    }

                    await interaction.update({
                        content:
                            `Have Fun ${interaction.user}! ☺️`,
                        embeds: [],
                        components: []
                    });

                    return;
                }

                /*
                 * =================================
                 * VERIFIED BUTTONS
                 * =================================
                 */

                if (
                    interaction.customId.startsWith(
                        'verified_'
                    )
                ) {

                    if (
                        !isVerified(
                            interaction.user.id
                        )
                    ) {
                        await interaction.reply({
                            content:
                                'You must be verified to use this button.',
                            ephemeral: true
                        });

                        return;
                    }

                    return;
                }

                return;
            }

            /*
             * =====================================
             * API KEY MODAL
             * =====================================
             */

            if (interaction.isModalSubmit()) {

                if (
                    interaction.customId !==
                    'verify_api_key_modal'
                ) {
                    return;
                }

                if (
                    VERIFICATION_CHANNEL_ID &&
                    interaction.channelId !==
                    VERIFICATION_CHANNEL_ID
                ) {
                    await interaction.reply({
                        content:
                            'Verification can only be completed in the #Enter Verification channel.',
                        ephemeral: true
                    });

                    return;
                }

                const apiKey =
                    interaction.fields
                        .getTextInputValue(
                            'torn_api_key'
                        )
                        .trim();

                /*
                 * Torn API keys are 16 characters.
                 */
                if (
                    !/^[A-Za-z0-9]{16}$/.test(
                        apiKey
                    )
                ) {
                    await interaction.reply({
                        content:
                            'Your key is not valid. Please try again.',
                        ephemeral: true
                    });

                    return;
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                /*
                 * =================================
                 * TORN API REQUEST
                 * =================================
                 */

                const apiUrl =
                    'https://api.torn.com/key/' +
                    '?selections=info' +
                    `&key=${encodeURIComponent(apiKey)}`;

                const response =
                    await fetch(apiUrl);

                if (!response.ok) {
                    await interaction.editReply({
                        content:
                            'Torn API could not be reached. Please try again later.'
                    });

                    return;
                }

                const data =
                    await response.json();

                console.log(
                    'Torn API response received.'
                );

                /*
                 * =================================
                 * TORN API ERROR
                 * =================================
                 */

                if (data.error) {

                    console.error(
                        'Torn API error:',
                        data.error
                    );

                    if (
                        Number(data.error.code) === 2
                    ) {
                        await interaction.editReply({
                            content:
                                'Your key is not valid. Please try again.'
                        });

                        return;
                    }

                    await interaction.editReply({
                        content:
                            'The Torn API could not verify this key. Please try again later.'
                    });

                    return;
                }

                /*
                 * =================================
                 * FIND TORN USER ID
                 * =================================
                 *
                 * Torn can return the user ID inside
                 * the user object. We also check the
                 * other possible locations so the bot
                 * does not fail unnecessarily.
                 */

                const tornId =
                    data?.user?.id ??
                    data?.user?.user_id ??
                    data?.user_id ??
                    data?.player_id ??
                    data?.id;

                if (!tornId) {

                    console.error(
                        'Torn API did not return a Torn user ID.'
                    );

                    console.error(
                        'Returned fields:',
                        Object.keys(data || {})
                    );

                    await interaction.editReply({
                        content:
                            'The key could not be linked to a Torn account. Please try again.'
                    });

                    return;
                }

                const normalizedTornId =
                    String(tornId);

                /*
                 * =================================
                 * SAVE DISCORD <-> TORN LINK
                 * =================================
                 *
                 * The API key itself is never stored.
                 */

                const saved =
                    saveVerifiedUser(
                        interaction.user.id,
                        normalizedTornId
                    );

                if (!saved.success) {

                    if (
                        saved.reason ===
                        'torn_account_already_linked'
                    ) {
                        await interaction.editReply({
                            content:
                                'This Torn account is already linked to another Discord account.'
                        });

                        return;
                    }

                    await interaction.editReply({
                        content:
                            'Verification could not be completed. Please try again.'
                    });

                    return;
                }

                /*
                 * =================================
                 * ROLE MANAGEMENT
                 * =================================
                 */

                const member =
                    interaction.member;

                if (!member) {
                    await interaction.editReply({
                        content:
                            'I could not find your server membership.'
                    });

                    return;
                }

                if (
                    UNVERIFIED_ROLE_ID &&
                    member.roles.cache.has(
                        UNVERIFIED_ROLE_ID
                    )
                ) {
                    await member.roles.remove(
                        UNVERIFIED_ROLE_ID
                    );
                }

                if (
                    VERIFIED_ROLE_ID &&
                    !member.roles.cache.has(
                        VERIFIED_ROLE_ID
                    )
                ) {
                    await member.roles.add(
                        VERIFIED_ROLE_ID
                    );
                }

                /*
                 * =================================
                 * SUCCESS
                 * =================================
                 */

                const successEmbed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(
                            `**Verified Success.** Thank you ${interaction.user} for joining Torn HQ!\n\n` +
                            'Do you want me to guide you to the server channels?'
                        );

                const buttons =
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    'verification_yes'
                                )
                                .setLabel('Yes')
                                .setStyle(
                                    ButtonStyle.Success
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'verification_no'
                                )
                                .setLabel('No')
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                        );

                await interaction.editReply({
                    content: '',
                    embeds: [
                        successEmbed
                    ],
                    components: [
                        buttons
                    ]
                });

                return;
            }

        } catch (error) {

            console.error(
                'Interaction error:',
                error
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {
                await interaction.reply({
                    content:
                        'Something went wrong. Please try again later.',
                    ephemeral: true
                }).catch(() => {});
            } else {
                await interaction.editReply({
                    content:
                        'Something went wrong. Please try again later.'
                }).catch(() => {});
            }
        }
    }
};
