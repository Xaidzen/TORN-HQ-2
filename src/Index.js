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
const {
    checkVerifiedUsers
} = require("./modules/verificationMonitor");

const {
    startClaimTracker
} = require("./modules/claimTracker");

const {
    startTornAttackTracker
} = require("./modules/tornAttackTracker");

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

    if (!command.data || !command.execute) {
        logger.info(
            `Skipped invalid command: ${file}`
        );
        continue;
    }

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

    if (!event.name || !event.execute) {
        logger.info(
            `Skipped invalid event: ${file}`
        );
        continue;
    }

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

/*
 * Discord ready
 */

client.once("ready", () => {
    console.log(
        `${client.user.tag} is online.`
    );

    /*
     * Verification monitor
     */

    console.log(
        "Verification monitor started."
    );

    setInterval(
        async () => {
            try {
                await checkVerifiedUsers(client);
            } catch (error) {
                console.error(
                    "Verification monitor error:",
                    error
                );
            }
        },
        5 * 60 * 1000
    );

    checkVerifiedUsers(client);

    /*
     * Loss claim tracker
     */

    startClaimTracker(client);

    /*
     * Torn City attack tracker
     */

    startTornAttackTracker();

    console.log(
        "Contract system started."
    );

    console.log(
        "Torn attack tracker started."
    );
});

/*
 * Login
 */

client.login(
    config.DISCORD_TOKEN
).catch(error => {
    console.error(
        "Discord login failed:",
        error
    );
});
