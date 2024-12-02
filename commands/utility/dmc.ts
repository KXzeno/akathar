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
	.setDescription('Declare Mutation Channel.')
	.addChannelOption(option => option .setName('channel')
	.setDescription('channel to post weekly mutations')
	.setRequired(true))
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.addBooleanOption(opt => opt.setName('terminate').setDescription('Cancel existing mutation prompter')),
	async execute(interaction: ChatInputCommandInteraction) {
		// await mutator.execute(interaction);
		// interaction.reply((`<#${interaction.options._hoistedOptions[0].value}>`));
		let channel = interaction.options.getChannel('channel');

		if (!interaction.guildId || !interaction.guild) throw new Error('Guild undetected.');
		if (!channel) throw new Error('Elected channel undetected.');

		// TODO: Handle further exceptions
		let terminate = interaction.options.getBoolean('terminate');
		if (terminate && mutator.weekIntvId !== null) {

			let nullifyCh = await prisma.config.update({
				where: {
					serverId_dmcChannelId: {
						serverId: interaction.guildId,
						dmcChannelId: channel.id,
					},
				},
				data: {
					dmcChannelId: `${channel.id}XNULL`
				}
			});
			interaction.reply({ content: 'Prompter terminated.', ephemeral: true});
			return clearTimeout(mutator.weekIntvId as NodeJS.Timeout);
		} else if (terminate && !(typeof mutator.weekIntvId === 'number')) {
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
				serverId_dmcChannelId: {
					serverId: interaction.guildId, 
					dmcChannelId: channel.id,
				}
			},
		});
		// console.log(targetChannel);
		if (targetChannel) {
			isListed = true;
			return interaction.reply({ content: 'Channel is already set', ephemeral: true });
		} else {
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
				console.log(`Server Initialized.\n${initServer}`);
				if (!interaction.guildId || !channel.id) return;

				let configData = {
					dmcChannelId: channel.id,
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
						dmcChannelId: channel.id,
					},
					create: configData as Prisma.ConfigCreateInput,
				});
				console.log(initConfig);
			} catch (err) {
				console.error(`Elected channel may already be listed: ${err}`);
			} finally {
				if (!isListed) {
					targetChannel = await prisma.config.findUnique({ 
						where: { 
							serverId_dmcChannelId: {
								serverId: interaction.guildId, 
								dmcChannelId: channel.id,
							}
						},
					});

					if (targetChannel === null) throw new Error ('Unable to create AND retrieve channel config.');
					// Begin auto-post
					targetChannel = interaction.guild.channels.cache.get((targetChannel as Config).dmcChannelId) as GuildBasedChannel as TextChannel;
					try {
						interaction.reply({ content: 'Channel set.', ephemeral: true });
						await targetChannel.sendTyping();
						await mutator.execute(interaction);
						isListed = true;
					} catch (err) {
						console.error(err);
						interaction.reply('Unable to utilize channel, ensure correct permissions.')
					} 
					console.log(targetChannel);
				}
			}
		}
	} 

	// mutator.execute(interaction)

	// TODO: 
	//x 1. Create scheduled mutation calls
	//x 2. Wrap POST reqs in control flow, prioritize reads
	//x 3. Update config data if new channel is chosen
	//x 4. Throw consumer side error if same channel is chosen, or do post look-back
	// 5. On disconnects, query DB and resume schedule on 'Ready' event
	//x 6. PST 03:00
	//x 7. Cache locally and let interval cycle through instead of rate limiting
	//x 8. Handle potential rate limit errors gracefully
	//x 9. ADR
	//
	//  ?. Allow forward and backward mutator search on regular call (mutator.ts)
};
