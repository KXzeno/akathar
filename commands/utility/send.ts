import { SlashCommandBuilder, TextChannel, ChatInputCommandInteraction, PermissionFlagsBits, User } from "discord.js";
import { scheduler } from "timers/promises";

export const command = {
	data: new SlashCommandBuilder()
	.setName('send')
	.setDescription('sends a message through a webhook')
	.addStringOption(input => input.setName('msg').setDescription('the message to send').setRequired(true))
	.addUserOption(user => user.setName('userinput').setDescription('a user for webhook reference'))
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
	async execute(interaction: ChatInputCommandInteraction) {
		let targetUser: User | null = interaction.options.getUser('userinput') || null;
		if (!targetUser) {
			targetUser = interaction.client.user;
		}
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
