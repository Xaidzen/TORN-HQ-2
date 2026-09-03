const {
    REST,
    Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const config = require("./utils/config");

const commands = [];

const commandsPath =
    path.join(__dirname, "commands");

const commandFiles =
    fs.readdirSync(commandsPath)
        .filter(file =>
            file.endsWith(".js")
        );

for (const file of commandFiles) {
    const command =
        require(
            path.join(commandsPath, file)
        );

    commands.push(
        command.data.toJSON()
    );
}

const rest = new REST({
    version: "10"
}).setToken(
    config.DISCORD_TOKEN
);

(async () => {
    try {
        console.log(
            `Registering ${commands.length} slash commands...`
        );

        await rest.put(
            Routes.applicationGuildCommands(
                config.CLIENT_ID,
                config.GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            "Slash commands registered successfully."
        );

    } catch (error) {
        console.error(error);
    }
})();
