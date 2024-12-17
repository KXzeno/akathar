import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('avatar')
	.setDescription('sends avatar')
	.addUserOption(input => input.setName('user').setDescription('get avatar for a specific user')),
	async execute(interaction: ChatInputCommandInteraction) {
		let userOpt = interaction.options.getUser('user');
		if (userOpt) {
			let avatarUrl = userOpt.displayAvatarURL({ extension: 'png', size: 1_024 });
			interaction.reply(avatarUrl);
		} else {
			interaction.reply(`https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png?size=256`);
		}
	}
}
