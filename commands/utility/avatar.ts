import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('avatar')
	.setDescription('sends avatar')
	.addUserOption(input => input.setName('user').setDescription('get avatar for a specific user')),
	async execute(interaction: ChatInputCommandInteraction) {
		let userOpt = interaction.options.getUser('user');
		if (userOpt) {
			interaction.reply(`https://cdn.discordapp.com/avatars/${userOpt.id}/${userOpt.avatar}.png?size=4096`);
		} else {
			interaction.reply(`https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png?size=256`);
		}
	}
}
