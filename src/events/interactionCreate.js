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
                 * /verify is available to everyone.
                 *
                 * Every other command requires
                 * verification.
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
                 * =================================
                 * ADD KEY
                 * =================================
                 */

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

                    const warning =
                        new TextInputBuilder()
                            .setCustomId(
                                'verification_warning'
                            )
                            .setLabel(
                                '⚠️ Do not add your personal information.'
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setPlaceholder(
                                'Only enter your Torn API key.'
                            )
                            .setRequired(false);

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
                            .addComponents(
                                warning
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                keyInput
                            )
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

                /*
                 * Only allow verification inside
                 * Enter Verification.
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

                /*
                 * Get API key.
                 */

                const apiKey =
                    interaction.fields
                        .getTextInputValue(
                            'torn_api_key'
                        )
                        .trim();

                /*
                 * Check API key format.
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

                /*
                 * Defer the response while
                 * contacting Torn.
                 */

                await interaction.deferReply({
                    ephemeral: true
                });

                /*
                 * =================================
                 * TORN API
                 * =================================
                 *
                 * The API key is only used here.
                 * It is NEVER saved to the database.
                 */

                const apiUrl =
                    'https://api.torn.com/key/' +
                    '?selections=info' +
                    `&key=${encodeURIComponent(apiKey)}`;

                let response;

                try {

                    response =
                        await fetch(
                            apiUrl,
                            {
                                method: 'GET',
                                headers: {
                                    'Accept':
                                        'application/json'
                                }
                            }
                        );

                } catch (error) {

                    console.error(
                        'Torn API connection error:',
                        error.message
                    );

                    await interaction.editReply({
                        content:
                            'Torn API could not be reached. Please try again later.'
                    });

                    return;
                }

                /*
                 * HTTP error.
                 */

                if (!response.ok) {

                    console.error(
                        'Torn API HTTP status:',
                        response.status
                    );

                    await interaction.editReply({
                        content:
                            'Torn API could not be reached. Please try again later.'
                    });

                    return;
                }

                let data;

                try {

                    data =
                        await response.json();

                } catch (error) {

                    console.error(
                        'Invalid Torn API response:',
                        error.message
                    );

                    await interaction.editReply({
                        content:
                            'Torn returned an invalid response. Please try again later.'
                    });

                    return;
                }

                /*
                 * =================================
                 * TORN API ERROR
                 * =================================
                 */

                if (data.error) {

                    console.error(
                        'Torn API error code:',
                        data.error.code
                    );

                    /*
                     * Torn error code 2 means
                     * incorrect API key.
                     */

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
                 * FIND TORN ACCOUNT ID
                 * =================================
                 *
                 * Different Torn API responses can
                 * expose the ID in different places.
                 */

                let tornId = null;

                if (
                    data &&
                    data.user &&
                    typeof data.user === 'object'
                ) {

                    tornId =
                        data.user.id ??
                        data.user.user_id ??
                        data.user.player_id;
                }

                if (!tornId) {
                    tornId =
                        data?.user_id ??
                        data?.player_id ??
                        data?.id;
                }

                /*
                 * Some responses may return the
                 * account information inside another
                 * object.
                 */

                if (
                    !tornId &&
                    data?.user &&
                    typeof data.user === 'string'
                ) {
                    tornId =
                        data.user;
                }

                /*
                 * =================================
                 * NO TORN ID
                 * =================================
                 */

                if (!tornId) {

                    /*
                     * Do NOT print the complete API
                     * response because it could contain
                     * sensitive information.
                     */

                    console.error(
                        'Torn verification succeeded, but no Torn account ID was found.'
                    );

                    console.error(
                        'Returned top-level fields:',
                        Object.keys(data || {})
                    );

                    await interaction.editReply({
                        content:
                            'The key could not be linked to a Torn account. Please try again.'
                    });

                    return;
                }

                tornId =
                    String(tornId);

                /*
                 * =================================
                 * DATABASE
                 * =================================
                 *
                 * Only Discord ID, Torn ID and
                 * verification timestamp are saved.
                 *
                 * API KEY IS NOT SAVED.
                 */

                const saved =
                    saveVerifiedUser(
                        interaction.user.id,
                        tornId
                    );

                if (!saved.success) {

                    /*
                     * Torn account already belongs
                     * to another Discord account.
                     */

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
                 * DISCORD MEMBER
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
                 * =================================
                 * REMOVE UNVERIFIED ROLE
                 * =================================
                 */

                if (
                    UNVERIFIED_ROLE_ID &&
                    member.roles.cache.has(
                        UNVERIFIED_ROLE_ID
                    )
                ) {

                    try {

                        await member.roles.remove(
                            UNVERIFIED_ROLE_ID
                        );

                    } catch (error) {

                        console.error(
                            'Failed to remove UNVERIFIED role:',
                            error.message
                        );
                    }
                }

                /*
                 * =================================
                 * GIVE VERIFIED ROLE
                 * =================================
                 */

                if (
                    VERIFIED_ROLE_ID &&
                    !member.roles.cache.has(
                        VERIFIED_ROLE_ID
                    )
                ) {

                    try {

                        await member.roles.add(
                            VERIFIED_ROLE_ID
                        );

                    } catch (error) {

                        console.error(
                            'Failed to add VERIFIED role:',
                            error.message
                        );

                        await interaction.editReply({
                            content:
                                'Your Torn account was verified, but I could not give you the VERIFIED role. Please contact a server administrator.'
                        });

                        return;
                    }
                }

                /*
                 * ==========================
