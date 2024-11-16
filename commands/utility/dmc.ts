import { GuildBasedChannel, TextChannel, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Prisma } from '@prisma/client';

import { command as mutator } from './mutator.ts';
import prisma from '../../prisma/db.ts';

let initServer: Prisma.ServerCreateInput | object = {};
let initConfig: Prisma.ServerUpdateInput | object = {};

interface Config {
	dmcChannelId: string;
}

let targetChannel: Config | GuildBasedChannel | null = null;

export const command = {
	data: new SlashCommandBuilder()
	.setName('dmc')
	.setDescription('Declare Mutation Channel')
	.addChannelOption(option =>
		option
		.setName('channel')
		.setDescription('channel to post weekly mutations')
		.setRequired(true))
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
	async execute(interaction: ChatInputCommandInteraction) {
		// await mutator.execute(interaction);
		// interaction.reply((`<#${interaction.options._hoistedOptions[0].value}>`));
		let channel = interaction.options.getChannel('channel');

		if (!interaction.guildId || !interaction.guild) throw new Error('Guild undetected.');
		if (!channel) throw new Error('Elected channel undetected.');

		// Find or Create logic
		try {
			targetChannel = await prisma.config.findUnique({ 
				where: { serverId: interaction.guildId },
			});
		} catch (err) {
			console.error(`ERR: Unable to retrieve channel config, attempting creation... ${err}`)
			try {
				initServer = await prisma.server.create({
					data: {
						serverId: interaction.guildId,
						guildName: interaction.guild.toString(),
					}
				});
			} catch (err) {
				console.error(`Guild may already be listed: ${err}`);
			}

			try { 
				initConfig = await prisma.server.update({
					where: { serverId: interaction.guildId },
					data: {
						config: {
							create: {
								dmcChannelId: channel.id
							}
						}
					}
				});
			} catch (err) {
				console.error(`Elected channel may already be listed: ${err}`);
			}
		} finally {
			targetChannel = await prisma.config.findUnique({ 
				where: { serverId: interaction.guildId },
			});
		}

		if (targetChannel === null) throw new Error ('Unable to create AND retrieve channel config.');
		// Begin auto-post
		targetChannel = interaction.guild.channels.cache.get((targetChannel as Config).dmcChannelId) as GuildBasedChannel as TextChannel;
		try {
			await targetChannel.send('Hi');
			interaction.reply('Channel set.');
		} catch (err) {
			console.error(err);
			interaction.reply('Unable to utilize channel, ensure correct permissions.')
		}

		// mutator.execute(interaction)

		// TODO: 
		// 1. Create scheduled mutation calls
		// 2. Wrap POST reqs in control flow, prioritize reads
		// 3. Update config data if new channel is chosen
		// 3. PST 10:00
		// 4. ADR
		//
		// x. Allow forward and backward mutator search on regular call (mutator.ts)
	},
};
