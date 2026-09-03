const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const config = require('../utils/config');
const { servicePanelEmbed, serviceButtons } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('service-role-panel')
    .setDescription('Create the Torn HQ service role panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Only allow this command in #unlock-service
    if (interaction.channelId !== config.UNLOCK_SERVICE_CHANNEL_ID) {
      return interaction.reply({
        content: 'You can only use /service-role-panel in the #unlock-service channel.',
        ephemeral: true
      });
    }

    // Admin only
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }

    await interaction.channel.send({
      embeds: [servicePanelEmbed()],
      components: [serviceButtons()]
    });

    return interaction.reply({
      content: 'Service role panel created successfully.',
      ephemeral: true
    });
  }
};
