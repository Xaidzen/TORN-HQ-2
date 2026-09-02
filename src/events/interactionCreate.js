const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

const database =
    require('../modules/database');

const VERIFICATION_CHANNEL_ID =
    process.env.VERIFICATION_CHANNEL_ID;

const VERIFIED_ROLE_ID =
    process.env.VERIFIED_ROLE_ID;

const UNVERIFIED_ROLE_ID =
    process.env.UNVERIFIED_ROLE_ID;

const SERVICES_CHANNEL_ID =
    process.env.SERVICES_CHANNEL_ID;

const LOSS_SELLER_ROLE_ID =
    process.env.LOSS_SELLER_ROLE_ID;

const ESCAPE_SELLER_ROLE_ID =
    process.env.ESCAPE_SELLER_ROLE_ID;

const BOUNTY_PLACER_ROLE_ID =
    process.env.BOUNTY_PLACER_ROLE_ID;

const AGENCY_DETECTIVE_ROLE_ID =
    process.env.AGENCY_DETECTIVE_ROLE_ID;

const CUSTOM_API_KEY_URL =
    'https://www.torn.com/preferences.php#tab=api?step=addNewKey&user=faction,basic,bounties,discord,personalstats,profile,cooldowns,crimes&torn=attacklog,bounties,crimes&title=Torn%20HQ';

const SERVICE_DATA = {

    service_loss_seller: {
        roleId: LOSS_SELLER_ROLE_ID,
        name: 'Loss Seller 🔫',
        description:
            'Start a fight with the buyer or target, intentionally lose, then use a Small Aid Kit for 20 minutes or less hospital time, or a First Aid Kit for over 30 minutes. Repeat until you complete the number of losses in your claimed contract.'
    },

    service_escape_seller: {
        roleId: ESCAPE_SELLER_ROLE_ID,
        name: 'Escape Seller 🏃🏻',
        description:
            'Coming Soon'
    },

    service_bounty_placer: {
        roleId: BOUNTY_PLACER_ROLE_ID,
        name: 'Bounty Placer 🎯',
        description:
            'Once you claim a contract, the target\'s profile link will appear. Place a bounty on the target using the exact contract price. Reminder: Anonymous bounties will not be paid unless the contract is specifically marked as anonymous.'
    },

    service_agency_detective: {
        roleId: AGENCY_DETECTIVE_ROLE_ID,
        name: 'Agency Detective 🕵🏻',
        description:
            'Coming Soon'
    }
};

module.exports = {

    name: Events.InteractionCreate,

    async execute(interaction) {

        try {

            /*
             * SLASH COMMANDS
             */

            if (interaction.isChatInputCommand()) {

                if (
                    interaction.commandName !== 'verify' &&
                    !database.isVerified(interaction.user.id)
                ) {

                    await interaction.reply({
                        content:
                            'You must verify your Torn account first.',
                        ephemeral: true
                    });

                    return;
                }

                const command =
                    interaction.client.commands.get(
                        interaction.commandName
                    );

                if (!command) {
                    return;
                }

                await command.execute(interaction);

                return;
            }


            /*
             * SERVICE ROLE BUTTONS
             */

            if (
                interaction.isButton() &&
                SERVICE_DATA[interaction.customId]
            ) {

                const service =
                    SERVICE_DATA[interaction.customId];

                if (!service.roleId) {

                    await interaction.reply({
                        content:
                            'This service role has not been configured yet.',
                        ephemeral: true
                    });

                    return;
                }

                if (!interaction.member) {

                    await interaction.reply({
                        content:
                            'Unable to find your server membership.',
                        ephemeral: true
                    });

                    return;
                }

                const role =
                    interaction.guild.roles.cache.get(
                        service.roleId
                    );

                if (!role) {

                    await interaction.reply({
                        content:
                            'The service role could not be found.',
                        ephemeral: true
                    });

                    return;
                }

                if (
                    interaction.member.roles.cache.has(
                        service.roleId
                    )
                ) {

                    await interaction.reply({
                        content:
                            `You already have the ${service.name} role.`,
                        ephemeral: true
                    });

                    return;
                }

                if (
                    !interaction.guild.members.me
                        .permissions.has('ManageRoles')
                ) {

                    await interaction.reply({
                        content:
                            'The bot does not have permission to manage roles.',
                        ephemeral: true
                    });

                    return;
                }

                if (
                    role.position >=
                    interaction.guild.members.me.roles.highest.position
                ) {

                    await interaction.reply({
                        content:
                            'I cannot assign this role because it is above or equal to my highest role.',
                        ephemeral: true
                    });

                    return;
                }

                await interaction.member.roles.add(
                    role,
                    `Selected ${service.name} service`
                );

                const embed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(service.name)
                        .setDescription(
                            service.description
                        );

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });

                return;
            }


            /*
             * VERIFY ADD KEY BUTTON
             */

            if (
                interaction.isButton() &&
                interaction.customId === 'verify_add_key'
            ) {

                const modal =
                    new ModalBuilder()
                        .setCustomId('verify_api_key_modal')
                        .setTitle('Torn API Key');

                const apiKeyInput =
                    new TextInputBuilder()
                        .setCustomId('torn_api_key')
                        .setLabel('Torn API Key')
                        .setStyle(
                            TextInputStyle.Short
                        )
                        .setPlaceholder(
                            'Paste your Torn API key here'
                        )
                        .setRequired(true);

                const row =
                    new ActionRowBuilder()
                        .addComponents(
                            apiKeyInput
                        );

                modal.addComponents(row);

                await interaction.showModal(modal);

                return;
            }


            /*
             * VERIFY YES BUTTON
             */

            if (
                interaction.isButton() &&
                interaction.customId === 'verify_yes'
            ) {

                await interaction.update({
                    content:
                        'Server channels will be added here later.',
                    embeds: [],
                    components: []
                });

                return;
            }


            /*
             * VERIFY NO BUTTON
             */

            if (
                interaction.isButton() &&
                interaction.customId === 'verify_no'
            ) {

                await interaction.update({
                    content:
                        `Have Fun ${interaction.user}! ☺️`,
                    embeds: [],
                    components: []
                });

                return;
            }


            /*
             * API KEY MODAL
             */

            if (
                interaction.isModalSubmit() &&
                interaction.customId === 'verify_api_key_modal'
            ) {

                await interaction.deferReply({
                    ephemeral: true
                });

                const apiKey =
                    interaction.fields.getTextInputValue(
                        'torn_api_key'
                    ).trim();

                if (!apiKey) {

                    await interaction.editReply({
                        content:
                            'Your key is not valid. Please try again.'
                    });

                    return;
                }

                if (apiKey.length < 20) {

                    await interaction.editReply({
                        content:
                            'Your key is not valid. Please try again.'
                    });

                    return;
                }

                const url =
                    `https://api.torn.com/user/?selections=basic&key=${encodeURIComponent(apiKey)}`;

                const response =
                    await fetch(url);

                const data =
                    await response.json();

                if (
                    data.error ||
                    !data.player_id
                ) {

                    await interaction.editReply({
                        content:
                            'Your key is not valid. Please try again.'
                    });

                    return;
                }

                const tornId =
                    String(data.player_id);

                const existing =
                    database.getDiscordUserByTornId(
                        tornId
                    );

                if (
                    existing &&
                    existing.discord_id !==
                    interaction.user.id
                ) {

                    await interaction.editReply({
                        content:
                            'This Torn account is already linked to another Discord account.'
                    });

                    return;
                }

                const result =
                    database.saveVerifiedUser(
                        interaction.user.id,
                        tornId
                    );

                if (!result.success) {

                    await interaction.editReply({
                        content:
                            'This Torn account is already linked to another Discord account.'
                    });

                    return;
                }

                const member =
                    await interaction.guild.members.fetch(
                        interaction.user.id
                    );

                const verifiedRole =
                    interaction.guild.roles.cache.get(
                        VERIFIED_ROLE_ID
                    );

                const unverifiedRole =
                    interaction.guild.roles.cache.get(
                        UNVERIFIED_ROLE_ID
                    );

                if (!verifiedRole) {

                    await interaction.editReply({
                        content:
                            'The VERIFIED role could not be found.'
                    });

                    return;
                }

                if (
                    !interaction.guild.members.me
                        .permissions.has('ManageRoles')
                ) {

                    await interaction.editReply({
                        content:
                            'The bot does not have permission to manage roles.'
                    });

                    return;
                }

                if (
                    verifiedRole.position >=
                    interaction.guild.members.me.roles.highest.position
                ) {

                    await interaction.editReply({
                        content:
                            'The VERIFIED role is above or equal to the bot role.'
                    });

                    return;
                }

                await member.roles.add(
                    verifiedRole,
                    'Torn account verification'
                );

                if (unverifiedRole) {

                    await member.roles.remove(
                        unverifiedRole,
                        'Torn account verification'
                    );
                }

                await interaction.editReply({
                    content:
                        `Verified Success. Thank you ${interaction.user} for joining Torn HQ!\n\nDo you want me to guide you to the server channels?`,
                    components: [
                        new ActionRowBuilder()
                            .addComponents(

                                {
                                    type: 2,
                                    custom_id: 'verify_yes',
                                    label: 'Yes',
                                    style: 3
                                },

                                {
                                    type: 2,
                                    custom_id: 'verify_no',
                                    label: 'No',
                                    style: 2
                                }

                            )
                    ]
                });

                return;
            }

        } catch (error) {

            console.error(
                'INTERACTION ERROR:',
                error
            );

            if (interaction.replied) {

                await interaction.editReply({
                    content:
                        'Something went wrong. Please try again.'
                }).catch(() => {});

            } else if (interaction.deferred) {

                await interaction.editReply({
                    content:
                        'Something went wrong. Please try again.'
                }).catch(() => {});

            } else {

                await interaction.reply({
                    content:
                        'Something went wrong. Please try again.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
