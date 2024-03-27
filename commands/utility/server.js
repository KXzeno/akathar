import { SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('server')
	.setDescription('Provides server information'),
	async execute(interaction) {
		await interaction.reply(`Server: ${interaction.guild.name}, Member Count: ${interaction.guild.memberCount}.`);
	},
};

