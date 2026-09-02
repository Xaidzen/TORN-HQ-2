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

                /*
                 * /verify is the ONLY command
                 * an unverified member can use.
                 */
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

                /*
                 * ADD KEY
                 */

                if (
                    interaction.customId ===
                    'verify_add_key'
                ) {

                    /*
                     * Add Key is only usable
                     * inside Enter Verification.
                     */
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

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                keyInput
                            );

                    modal.addComponents(row);

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
                 * VERIFIED ONLY BUTTONS
                 * =================================
                 *
                 * Any future verified button should
                 * start with "verified_".
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

                    /*
                     * Future verified button
                     * code goes here.
                     */

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

                /*
                 * Modal can only be submitted
                 * from Enter Verification.
                 */
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
                 * Basic API key format check.
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
                 * Validate the key with Torn.
                 *
                 * IMPORTANT:
                 * The key is NEVER saved.
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

                /*
                 * Torn returned an error.
                 */
                if (data.error) {

                    /*
                     * Incorrect key.
                     */
                    if (
                        data.error.code === 2
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
                 * Find Torn account ID.
                 */
                const tornId =
                    data?.user?.id ??
                    data?.user_id;

                if (!tornId) {
                    await interaction.editReply({
                        content:
                            'The key could not be linked to a Torn account. Please try again.'
                    });

                    return;
                }

                /*
                 * Prevent one Torn account from
                 * being connected to multiple Discord
                 * accounts.
                 */
                const saved =
                    saveVerifiedUser(
                        interaction.user.id,
                        tornId
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

                /*
                 * Remove UNVERIFIED.
                 */
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

                /*
                 * Give VERIFIED.
                 */
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
                 * SUCCESS MESSAGE
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
