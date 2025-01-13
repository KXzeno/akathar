import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('avatar')
	.setDescription('sends avatar')
	.addUserOption(input => input.setName('user').setDescription('get avatar for a specific user').setRequired(true))
	.addBooleanOption(isCustom => isCustom.setName('guild-avatar').setDescription('display the user\'s guild avatar instead')),
	async execute(interaction: ChatInputCommandInteraction) {
		let userOpt = interaction.options.getUser('user');
		let isGuild = interaction.options.getBoolean('guild-avatar');
		if (!interaction.guild) {
			throw new Error('No guild found.');
		}

		if (userOpt) {
			let user = interaction.guild.members.cache.find(user => user.id === userOpt.id);
			if (user && isGuild) {
				return interaction.reply(user.displayAvatarURL({ extension: 'png', size: 1_024 }));
			}
			let avatarUrl = userOpt.displayAvatarURL({ extension: 'png', size: 1_024 });
			interaction.reply(avatarUrl);
		} else {
			interaction.reply(`https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png?size=256`);
		}
	}
}
