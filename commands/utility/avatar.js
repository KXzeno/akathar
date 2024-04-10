import { SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('avatar')
	.setDescription('sends avatar'),
	async execute(interaction) {
		interaction.reply(`https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}`);
	}
}
