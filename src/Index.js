
require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const commandsPath =
    path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {

    const commandFiles =
        fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {

        const filePath =
            path.join(commandsPath, file);

        const command =
            require(filePath);

        if (!command.data || !command.execute) {
            continue;
        }

        const commandData = Array.isArray(command.data)
            ? command.data
            : [command.data];

        for (const data of commandData) {

            client.commands.set(
                data.name,
                command
            );

        }
    }
}

const eventsPath =
    path.join(__dirname, 'events');

if (fs.existsSync(eventsPath)) {

    const eventFiles =
        fs.readdirSync(eventsPath)
            .filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {

        const filePath =
            path.join(eventsPath, file);

        const event =
            require(filePath);

        if (event.once) {

            client.once(
                event.name,
                (...args) => event.execute(...args)
            );

        } else {

            client.on(
                event.name,
                (...args) => event.execute(...args)
            );

        }
    }
}

client.on('ready', () => {

    console.log(
        `Logged in as ${client.user.tag}`
    );

    console.log(
        'Guilds:',
        client.guilds.cache.size
    );

    console.log(
        'Message Content Intent:',
        client.options.intents.has(
            GatewayIntentBits.MessageContent
        )
    );

    console.log(
        'Guild Messages Intent:',
        client.options.intents.has(
            GatewayIntentBits.GuildMessages
        )
    );

});

if (!process.env.DISCORD_TOKEN) {

    console.error(
        'DISCORD_TOKEN is missing from .env'
    );

    process.exit(1);
}

client.login(
    process.env.DISCORD_TOKEN
);
