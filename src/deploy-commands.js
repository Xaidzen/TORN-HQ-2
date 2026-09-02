require('dotenv').config();

const {
    REST,
    Routes
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const commands = [];

const commandsPath = path.join(
    __dirname,
    'commands'
);

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {

    const command = require(
        path.join(commandsPath, file)
    );

    if (!command.data) {
        continue;
    }

    const commandData = Array.isArray(command.data)
        ? command.data
        : [command.data];

    for (const data of commandData) {
        commands.push(data.toJSON());
    }
}

const rest = new REST({
    version: '10'
}).setToken(
    process.env.DISCORD_TOKEN
);

(async () => {

    try {

        console.log(
            `🔄 Registering ${commands.length} slash command(s)...`
        );

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.TARGET_GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            '✅ Slash commands registered successfully.'
        );

    } catch (error) {

        console.error(
            '❌ Failed to register slash commands:',
            error
        );

    }

})();
