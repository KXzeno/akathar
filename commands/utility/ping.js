import { SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies to ping'),
	async execute(interaction) {
		await interaction.reply('Success');
	},
};
