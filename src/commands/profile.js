const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const https = require('https');

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

    async execute(interaction, db) {
        await interaction.deferReply();

        const targetDiscordUser =
            interaction.options.getUser('user') || interaction.user;

        // Get the Torn API key from your database
        const row = db.prepare(`
            SELECT api_key
            FROM users
            WHERE discord_id = ?
        `).get(targetDiscordUser.id);

        if (!row || !row.api_key) {
            return interaction.editReply({
                content: `${targetDiscordUser} does not have a Torn API key connected.`
            });
        }

        try {
            const profile = await getTornProfile(row.api_key);

            const lifeCurrent = profile.life?.current ?? 0;
            const lifeMaximum = profile.life?.maximum ?? 0;

            const age =
                profile.age ?? 'N/A';

            const statusData =
                profile.status || {};

            let status = 'Offline';

            if (
                statusData.state === 'Traveling' ||
                statusData.state === 'Traveling Abroad'
            ) {
                const country =
                    statusData.description ||
                    statusData.details ||
                    '';

                status = country
                    ? `Flying ${country}`
                    : 'Flying';
            } else if (statusData.state === 'Online') {
                status = 'Online';
            } else if (statusData.state === 'Idle') {
                status = 'Idle';
            } else if (statusData.state) {
                status = statusData.state;
            }

            const factionName =
                profile.faction?.faction_name ||
                profile.faction?.name ||
                'None';

            const propertyName =
                profile.property ||
                profile.property_name ||
                'None';

            const friends =
                profile.friends?.length ??
                profile.friends_count ??
                0;

            const enemies =
                profile.enemies?.length ??
                profile.enemies_count ??
                0;

            const embed = new EmbedBuilder()
                .setTitle('Information of user')
                .setDescription(
                    `**user [${profile.player_id || profile.player_id}] - ${profile.name || targetDiscordUser.username} [${profile.player_id}]**`
                )
                .setThumbnail(
                    profile.profile_image ||
                    profile.profile_image_url ||
                    targetDiscordUser.displayAvatarURL({ dynamic: true })
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
                    text: `Torn ID: ${profile.player_id}`
                })
                .setTimestamp();

            return interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Profile command error:', error);

            return interaction.editReply({
                content: 'Unable to retrieve this Torn profile. Please check the connected API key.'
            });
        }
    }
};


function getTornProfile(apiKey) {
    return new Promise((resolve, reject) => {

        const url =
            `https://api.torn.com/user/?selections=profile&key=${encodeURIComponent(apiKey)}`;

        https.get(url, response => {

            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {

                try {
                    const result = JSON.parse(data);

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
