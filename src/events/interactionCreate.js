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

const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const UNVERIFIED_ROLE_ID = process.env.UNVERIFIED_ROLE_ID;
const VERIFICATION_CHANNEL_ID = process.env.VERIFICATION_CHANNEL_ID;

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
                 * YES
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
                 * NO
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
                 * VERIFIED ONLY BUTTONS
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
                 * TORN API
                 * =================================
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
                        'Torn HTTP status:',
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
                 * NEVER log the API key.
                 */

                if (data.error) {

                    console.error(
                        'Torn API error code:',
                        data.error.code
                    );

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
                 * TORN PLAYER ID
                 * =================================
                 */

                const tornId =
                    data?.player_id;

                if (!tornId) {

                    console.error(
                        'Torn API did not return player_id.'
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
                 * CHECK EXISTING TORN LINK
                 * =================================
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
                 * GET MEMBER
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
                    await interaction.guild.members.fetch(
                        interaction.user.id
                    );

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
                            'The VERIFIED role is not configured. Please contact an administrator.'
                    });

                    return;
                }

                const verifiedRole =
                    await interaction.guild.roles.fetch(
                        VERIFIED_ROLE_ID
                    );

                if (!verifiedRole) {

                    console.error(
                        'VERIFIED role not found:',
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
                 * BOT ROLE CHECK
                 * =================================
                 */

                const botMember =
                    await interaction.guild.members.fetch(
                        interaction.client.user.id
                    );

                if (!botMember) {

                    await interaction.editReply({
                        content:
                            'I could not find the bot in this server.'
                    });

                    return;
                }

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

                if (
                    verifiedRole.position >=
                    botMember.roles.highest.position
                ) {

                    console.error(
                        'VERIFIED role is above or equal to the bot role.'
                    );

                    console.error(
                        'VERIFIED role position:',
                        verifiedRole.position
                    );

                    console.error(
                        'Bot role position:',
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
                        UNVERIFIED_ROLE_ID
                    )
                ) {

                    try {

                        await member.roles.remove(
                            UNVERIFIED_ROLE_ID,
                            'Torn HQ verification successful'
                        );

                    } catch (error) {

                        console.error(
                            'Failed to remove UNVERIFIED:',
                            error
                        );

                        await interaction.editReply({
                            content:
                                'Verification succeeded, but I could not remove your UNVERIFIED role.'
                        });

                        return;
                    }
                }

                /*
                 * =================================
                 * ADD VERIFIED
                 * =================================
                 */

                if (
                    !member.roles.cache.has(
                        VERIFIED_ROLE_ID
                    )
                ) {

                    try {

                        await member.roles.add(
                            verifiedRole,
                            'Torn HQ verification successful'
                        );

                    } catch (error) {

                        console.error(
                            'Failed to add VERIFIED:',
                            error
                        );

                        await interaction.editReply({
                            content:
                                'Your Torn account was verified, but I could not give you the VERIFIED role. Please contact an administrator.'
                        });

                        return;
                    }
                }

                /*
                 * =================================
                 * SAVE LINK
                 * =================================
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
                 * SUCCESS
                 * =================================
                 */

                const successEmbed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(
                            `**Verified Success.** Thank you ${interaction.user} for joining Torn HQ!\n\n` +
                            'Do you want me to guide you to the server channels?'
                        
