import { GuildBasedChannel, TextChannel, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Prisma } from '@prisma/client';

import prisma from '../../prisma/db.ts';

let initServer: Prisma.ServerCreateInput | object = {};
let initConfig: Prisma.ServerUpdateInput | object = {};

interface Config {
	timetableChannelId: string;
}

let targetChannel: Config | GuildBasedChannel | null = null;

export const command = {
	data: new SlashCommandBuilder()
	.setName('settimetable')
	.setDescription('initializes channel for created reminders')
	.addChannelOption(option => option .setName('channel')
	.setDescription('channel to assign ongoing reminders')
	.setRequired(true))
	// TODO: implement role adder
	//.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.addBooleanOption(opt => opt.setName('terminate').setDescription('terminate listener for reminders')),
	hasTimeTable: false,
	timetableChannelId: undefined as unknown as string,
	//.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	async execute(interaction: ChatInputCommandInteraction) {
		let channel = interaction.options.getChannel('channel');

		if (!interaction.guildId || !interaction.guild) throw new Error('Guild undetected.');
		if (!channel) throw new Error('Elected channel undetected.');

		// TODO: Handle further exceptions
		let terminate = interaction.options.getBoolean('terminate');
		if (terminate || (terminate && targetChannel && (targetChannel as Config).timetableChannelId.includes("XNULL") === false)) {

			let nullifyCh = await prisma.config.update({
				where: {
					serverId_timetableChannelId: {
						serverId: interaction.guildId,
						timetableChannelId: channel.id,
					},
				},
				data: {
					timetableChannelId: `${channel.id}XNULL`
				}
			});
			interaction.reply({ content: 'Listener terminated.', ephemeral: true});
			return command.hasTimeTable = false;
			// TODO: Terminate logic
		} else if (terminate) {
			return interaction.reply({ content: 'Prompter wasn\'t initialized.', ephemeral: true});
		}

		// Find or Create logic
		let isListed: boolean = false;
		/** @remarks
		 *  Find unique (and possibly all else)resolves it's own exceptions in the server 
		 *  then returns null, try/catch blocks will fail to follow intended control flow
		 *
		 *  Upsert `where` field only applies to unique members,
		 *  if need—use `findOrCreate` instead */
		targetChannel = await prisma.config.findUnique({ 
			where: { 
				// Uses compound restraint
				serverId_timetableChannelId: {
					serverId: interaction.guildId, 
					timetableChannelId: channel.id,
				}
			},
		}) as Config;
		if (targetChannel) {
			isListed = true;
			command.hasTimeTable = true;
			command.timetableChannelId = channel.id;
			return interaction.reply({ content: 'Channel is already set', ephemeral: true });
		} else {
			// Ensure truthiness of hasTimeTable
			command.hasTimeTable = false;
			console.error(`ERR: Unable to retrieve channel config, attempting creation...`)
			try {
				let serverData = {
					serverId: interaction.guildId,
					guildName: interaction.guild.toString(),
				}
				initServer = await prisma.server.upsert({
					where: { serverId: interaction.guildId },
					update: { guildName: serverData.guildName },
					create: serverData,
				});
				if (!interaction.guildId || !channel.id) return;

				let configData = {
					timetableChannelId: channel.id,
					server: {
						connect: {
							serverId: interaction.guildId,
						}
					}
				};

				let initConfig = await prisma.config.upsert({
					where: {
						serverId: interaction.guildId,
					},
					update: { 
						timetableChannelId: channel.id,
					},
					create: configData as Prisma.ConfigCreateInput,
				});

				// Initialized
				command.hasTimeTable = true;
				command.timetableChannelId = channel.id;
			} catch (err) {
				console.error(`Elected channel may already be listed: ${err}`);
			} finally {
				if (!isListed) {
					targetChannel = await prisma.config.findUnique({ 
						where: { 
							serverId_timetableChannelId: {
								serverId: interaction.guildId, 
								timetableChannelId: channel.id,
							}
						},
					}) as Config;

					if (targetChannel === null) throw new Error ('Unable to create AND retrieve channel config.');
					// Begin auto-post
					targetChannel = interaction.guild.channels.cache.get((targetChannel as Config).timetableChannelId) as GuildBasedChannel as TextChannel;
					try {
						interaction.reply({ content: 'Channel set.', ephemeral: true });
						await targetChannel.sendTyping();
						// TODO: Reminder fetching logic
						isListed = true;
					} catch (err) {
						console.error(err);
						interaction.reply('Unable to utilize channel, ensure correct permissions.')
					} 
				} else {
					// Ensure initialization
					command.hasTimeTable = true;
					command.timetableChannelId = channel.id;
				}
			}
		}
	} 
};

