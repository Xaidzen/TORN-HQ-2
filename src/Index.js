const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const config = require("./utils/config");
const logger = require("./utils/logger");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],

    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember
    ]
});

client.commands = new Collection();

/*
 * Load commands
 */

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

    client.commands.set(
        command.data.name,
        command
    );

    logger.info(
        `Loaded command: ${command.data.name}`
    );
}

/*
 * Load events
 */

const eventsPath =
    path.join(__dirname, "events");

const eventFiles =
    fs.readdirSync(eventsPath)
        .filter(file =>
            file.endsWith(".js")
        );

for (const file of eventFiles) {
    const event =
        require(
            path.join(eventsPath, file)
        );

    if (event.once) {
        client.once(
            event.name,
            (...args) =>
                event.execute(
                    ...args
                )
        );
    } else {
        client.on(
            event.name,
            (...args) =>
                event.execute(
                    ...args
                )
        );
    }

    logger.info(
        `Loaded event: ${event.name}`
    );
}

client.login(
    config.DISCORD_TOKEN
);
