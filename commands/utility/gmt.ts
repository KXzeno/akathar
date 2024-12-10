import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const command = {
	data: new SlashCommandBuilder()
	.setName('gmt')
	.setDescription("Get current timer for next weekly mutation.")
	// TODO: Add role caching and rely on roles instead of perms
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
	awaitingDate: null as Date | null,
	async execute(interaction: ChatInputCommandInteraction) {
		let { awaitingDate } = command;
		if (awaitingDate === null) return interaction.reply({ content: 'No timer set.', ephemeral: true });
		let now: Date = new Date();
		// let duration: number = awaitingDate.valueOf() - now.valueOf();
		interaction.reply(`Awaiting Date: ${new Intl.DateTimeFormat('en-US').format(awaitingDate)}\nDuration: <t:${Math.floor(awaitingDate.valueOf() / 1000)}:F>`);
	}
}
