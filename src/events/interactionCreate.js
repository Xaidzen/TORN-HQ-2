const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionsBitField
} = require('discord.js');

const {
    saveVerifiedUser,
    isVerified,
    getDiscordUserByTornId
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
                 * All other commands require verification.
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
                                'warning'
                            )
                            .setLabel(
                                'WARNING: Do not add your personal information.'
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setPlaceholder(
                                'Only enter your Torn API key.'
                            )
                            .setRequired(false)
                            .setMaxLength(1);

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

                    /*
                     * Discord modals require each component
                     * to be inside its own ActionRow.
                     */

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(warning),

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
                        content: '',
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
                 * FUTURE VERIFIED BUTTONS
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
                 * the Enter Verification channel.
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
                 * Validate basic API key format.
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
                 * VERIFY KEY WITH TORN
                 * =================================
                 *
                 * We use the User Basic endpoint.
                 *
                 * Torn returns:
                 *
                 * {
                 *     "level": 100,
                 *     "gender": "...",
                 *     "player_id": 123456,
                 *     "name": "...",
                 *     "status": [...]
                 * }
                 *
                 * The API key is NEVER saved.
                 */

                const apiUrl =
                    'https://api.torn.com/user/' +
                    '?selections=basic' +
                    `&key=${encodeURIComponent(apiKey)}`;

                const response =
                    await fetch(
                        apiUrl,
                        {
                            headers: {
                                'Accept':
                                    'application/json',
                                'User-Agent':
                                    'Torn-HQ-Discord-Bot'
                            }
                        }
                    );

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

                const data =
                    await response.json();

                /*
                 * IMPORTANT:
                 * Never log the API key.
                 *
                 * We only log the response structure.
                 */

                if (data.error) {

                    console.error(
                        'Torn API error code:',
                        data.error.code
                    );

                    /*
                     * Error 2 = incorrect API key.
                     */

                    if (
                        Number(
                            data.error.code
                        ) === 2
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
                 * GET TORN ACCOUNT ID
                 * =================================
                 */

                const tornId =
                    data?.player_id;

                if (!tornId) {

                    console.error(
                        'Torn API did not return player_id.'
                    );

                    console.error(
                        'Torn response fields:',
                        Object.keys(
                            data || {}
                        )
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
                 * CHECK EXISTING TORN LINK
                 * =================================
                 *
                 * One Torn account can only belong
                 * to one Discord account.
                 */

                const existingTornUser =
                    getDiscordUserByTornId(
                        normalizedTornId
                    );

                if (
                    existingTornUser &&
                    existingTornUser.discord_id !==
                    interaction.user.id
                ) {

                    await interaction.editReply({
                        content:
                            'This Torn account is already linked to another Discord account.'
                    });

                    return;
                }

                /*
                 * =================================
                 * GET SERVER MEMBER
                 * =================================
                 */

                if (!interaction.guild) {

                    await interaction.editReply({
                        content:
                            'Verification must be completed inside the Torn HQ server.'
                    });

                    return;
                }

                const member =
                    await interaction.guild.members
                        .fetch(
                            interaction.user.id
                        );

                if (!member) {

                    await interaction.editReply({
                        content:
                            'I could not find your server membership.'
                    });

                    return;
                }

                /*
                 * =================================
                 * GET VERIFIED ROLE
                 * =================================
                 */

                if (!VERIFIED_ROLE_ID) {

                    console.error(
                        'VERIFIED_ROLE_ID is missing from .env'
                    );

                    await interaction.editReply({
                        content:
                            'The VERIFIED role is not configured yet. Please contact an administrator.'
                    });

                    return;
                }

                const verifiedRole =
                    await interaction.guild.roles
                        .fetch(
                            VERIFIED_ROLE_ID
                        );

                if (!verifiedRole) {

                    console.error(
                        'VERIFIED role was not found:',
                        VERIFIED_ROLE_ID
                    );

                    await interaction.editReply({
                        content:
                            'The VERIFIED role could not be found. Please contact an administrator.'
                    });

                    return;
                }

                /*
                 * =================================
                 * CHECK BOT PERMISSIONS
                 * =================================
                 */

                const botMember =
                    await interaction.guild.members
                        .fetch(
                            interaction.client.user.id
                        );

                if (!botMember) {

                    await interaction.editReply({
                        content:
                            'I could not find my bot member in this server.'
                    });

                    return;
                }

                /*
                 * Bot needs Manage Roles.
                 */

                if (
                    !botMember.permissions.has(
                        PermissionsBitField.Flags.ManageRoles
                    )
                ) {

                    console.error(
                        'Bot is missing Manage Roles permission.'
                    );

                    await interaction.editReply({
                        content:
                            'I cannot give you the VERIFIED role because I do not have the Manage Roles permission.'
                    });

                    return;
                }

                /*
                 * Discord requires the bot's highest
                 * role to be above the role it is trying
                 * to manage.
                 */

                if (
                    verifiedRole.position >=
                    botMember.roles.highest.position
                ) {

                    console.error(
                        'VERIFIED role is not below the bot role.'
                    );

                    console.error(
                        'VERIFIED role position:',
                        verifiedRole.position
                    );

                    console.error(
                        'Bot highest role position:',
                        botMember.roles.highest.position
                    );

                    await interaction.editReply({
                        content:
                            'I cannot give you the VERIFIED role because my bot role is not higher than the VERIFIED role. Move the bot role above VERIFIED in Server Settings > Roles.'
                    });

                    return;
                }

                /*
                 * =================================
                 * REMOVE UNVERIFIED
                 * =================================
                 */

                if (
                    UNVERIFIED_ROLE_ID &&
                    member.roles.cache.has(
                        
