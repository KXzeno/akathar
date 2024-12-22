import { SlashCommandBuilder, TextChannel, ChatInputCommandInteraction } from "discord.js";
import { scheduler } from "timers/promises";

export const command = {
	data: new SlashCommandBuilder()
	.setName('send')
	.setDescription('sends a message through a webhook')
	.addStringOption(input => input.setName('msg').setDescription('the message to send').setRequired(true))
	.addUserOption(user => user.setName('userinput').setDescription('a user for webhook reference').setRequired(true)),
	async execute(interaction: ChatInputCommandInteraction) {
		let targetUser = interaction.options.getUser('userinput');
		let msg = interaction.options.getString('msg');

		// TODO: Handle exceptions
		if (!targetUser) return;

		let webhook = await (interaction.channel as TextChannel).createWebhook({ 
			name: targetUser.username,
			avatar: targetUser.displayAvatarURL(),
		});
		await webhook.send(`${msg}`);
		let reply = await interaction.reply({ content: 'Sent.', ephemeral: true});
		webhook.delete();
		await scheduler.wait(5000);
		reply.delete();
	}
}
