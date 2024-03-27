import { SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('user')
	.setDescription('Provides user information'),
	async execute(interaction) {
		await interaction.reply(`${interaction.user.username}, join date: ${interaction.member.joinedAt}.`);
	},
};
