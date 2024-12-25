import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { Nexus } from '../../utils/index.ts';

export const command = {
	data: new SlashCommandBuilder()
	.setName('nexus-fetch')
	.setDescription('fetch available guilds'),
	async execute(interaction: ChatInputCommandInteraction) {
		let guildData = Nexus.fetchGuilds();

		let debriefing = guildData.find(guild => guild.name === 'Debriefing');
		if (!debriefing) {
			throw new Error('Cannot find server.');
		}

		let emoji = debriefing.data.emojis.cache.find(emoji => emoji.id === '1321526319858716724');
		if (!emoji) {
			throw new Error('Emoji not found.');
		}

		console.log(guildData);

		let guilds: string = guildData
		.map(guild => guild.name)
		.reduce((p, n) => {
			//	if (n === 'Kharner') {
			//		return p + '\n' + `${emoji.toString()}  ${n}`;
			//	}
			return p + '\n' + `${emoji.toString()} ${n}`;
		}, '');

		let embed = new EmbedBuilder()
		.setTitle('Available Guilds')
		.setDescription(guilds)
		.setColor('#ECE852');

		interaction.reply({
			embeds: [embed]
		})
	}
}
