import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Prisma } from '@prisma/client';

// import { command as mutator } from './mutator';
import prisma from '../../prisma/db.ts';

let initServer: Prisma.ServerCreateInput | object = {};
let initConfig: Prisma.ServerUpdateInput | object = {};

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
		interaction.reply((`${channel} && ${interaction.guildId}`));

		if (!interaction.guildId || !interaction.guild) throw new Error('Guild undetected.');
		if (!channel) throw new Error('Elected channel undetected.');

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

	},
};

