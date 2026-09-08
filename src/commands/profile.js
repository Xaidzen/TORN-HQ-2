const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const https = require('https');
const db = require('../modules/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your or others profile.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The Discord user whose Torn profile you want to view.')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetDiscordUser =
            interaction.options.getUser('user') || interaction.user;

        const row = db.prepare(`
            SELECT torn_id, torn_username, encrypted_api_key
            FROM users
            WHERE discord_id = ?
        `).get(targetDiscordUser.id);

        if (!row || !row.encrypted_api_key) {
            return interaction.editReply({
                content: `${targetDiscordUser} does not have a Torn API key connected.`
            });
        }

        try {
            const { decrypt } = require('../modules/tornApi');
            const config = require('../utils/config');

            const apiKey = decrypt(
                row.encrypted_api_key,
                config.ENCRYPTION_KEY
            );

            const profile = await getTornProfile(
                apiKey,
                row.torn_id
            );

            const lifeCurrent =
                profile.life?.current ?? 0;

            const lifeMaximum =
                profile.life?.maximum ?? 0;

            const factionName =
                profile.faction?.faction_name ||
                profile.faction?.name ||
                'None';

            const propertyName =
                profile.property?.name ||
                profile.property ||
                profile.property_name ||
                'None';

            const friends =
                typeof profile.friends === 'number'
                    ? profile.friends
                    : profile.friends?.length ??
                      profile.friends_count ??
                      0;

            const enemies =
                typeof profile.enemies === 'number'
                    ? profile.enemies
                    : profile.enemies?.length ??
                      profile.enemies_count ??
                      0;

            const age =
                profile.age ?? 'N/A';

            let status = 'Offline';

            if (profile.status) {
                if (
                    profile.status.state === 'Traveling' ||
                    profile.status.state === 'Traveling Abroad'
                ) {
                    const country =
                        profile.status.description ||
                        profile.status.details ||
                        '';

                    status = country
                        ? `Flying ${country}`
                        : 'Flying';
                } else if (
                    profile.status.state === 'Online'
                ) {
                    status = 'Online';
                } else if (
                    profile.status.state === 'Idle'
                ) {
                    status = 'Idle';
                } else if (
                    profile.status.state
                ) {
                    status = profile.status.state;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(
                    `Information of ${targetDiscordUser.username}`
                )
                .setDescription(
                    `**${profile.name || row.torn_username} [${profile.player_id || row.torn_id}]**`
                )
                .setThumbnail(
                    profile.profile_image ||
                    profile.profile_image_url ||
                    targetDiscordUser.displayAvatarURL({
                        dynamic: true
                    })
                )
                .addFields(
                    {
                        name: 'Age',
                        value: `${age}`,
                        inline: false
                    },
                    {
                        name: 'Life',
                        value: `${lifeCurrent}/${lifeMaximum}`,
                        inline: false
                    },
                    {
                        name: 'Status',
                        value: status,
                        inline: false
                    },
                    {
                        name: 'Faction',
                        value: factionName,
                        inline: false
                    },
                    {
                        name: 'Property',
                        value: propertyName,
                        inline: false
                    },
                    {
                        name: 'Friends',
                        value: `${friends}`,
                        inline: false
                    },
                    {
                        name: 'Enemies',
                        value: `${enemies}`,
                        inline: false
                    }
                )
                .setFooter({
                    text: `Torn ID: ${profile.player_id || row.torn_id}`
                })
                .setTimestamp();

            return interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error(
                'Profile command error:',
                error
            );

            return interaction.editReply({
                content:
                    'Unable to retrieve this Torn profile. Please check the connected API key.'
            });
        }
    }
};


function getTornProfile(apiKey, tornId) {
    return new Promise((resolve, reject) => {

        const url =
            `https://api.torn.com/user/${tornId}/?selections=profile&key=${encodeURIComponent(apiKey)}`;

        https.get(url, response => {

            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {

                try {
                    const result =
                        JSON.parse(data);

                    if (result.error) {
                        return reject(
                            new Error(
                                `${result.error.code}: ${result.error.error}`
                            )
                        );
                    }

                    resolve(result);

                } catch (error) {
                    reject(error);
                }
            });

        }).on('error', reject);
    });
}
