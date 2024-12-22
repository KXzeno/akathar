import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

//const dir = dirname(import.meta.filename);
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);

// Create new client instance
interface ClientWithCommands extends Client {
	commands: Collection<string, any>
}

let client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions] }) as ClientWithCommands;

client.commands = new Collection();

const commandFoldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandFoldersPath);

let importPromises = [];

for await (const folder of commandFolders) {
	const commandsPath = path.join(commandFoldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const fileURL = new URL(`file://${filePath}`);
			importPromises.push(
				import(fileURL.toString()).then(module => {
					const { command } = module;
					// Set a new item in the Collection with the key as the command name and the value as the exported module
					if ('data' in command && 'execute' in command) {
						client.commands.set(command.data.name, command);
					} else {
						// console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
					}
				}).catch(error => {
					console.error(`[ERROR] Failed to import command file at ${filePath}: ${error}`);
				}));
	}
}

await Promise.all(importPromises).then(() => { importPromises = []; });

const eventFilesPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventFilesPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for await (const file of eventFiles) {
	const filePath = path.join(eventFilesPath, file);
	const fileURL = new URL(`file://${filePath}`);
		importPromises.push(
			import(fileURL.toString()).then(module => {
				const { event } = module;
				if (event.once) {
					client.once(event.name, (...args) => event.execute(...args));
				} else {
					client.on(event.name, (...args) => event.execute(...args));
				}
			}).catch(err => {
				console.error(`[ERROR] Failed to import command file at ${filePath}: ${err}`);
			}));
}

await Promise.all(importPromises).then(() => { importPromises = []; });

// Log in to Discord with your client's token
client.login(process.env.TOKEN);
