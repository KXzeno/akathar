import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder, MessageCollector, ComponentType } from "discord.js";

export const command = {
	data: new SlashCommandBuilder()
	.setName('cerebrate')
	.setDescription('connect to an external server'),
	async execute(interaction: ChatInputCommandInteraction, channel: TextChannel, reason: string | null) {
		if (!interaction.guild) throw new Error('Caller\'s guild undetected.');

		let connect = new ButtonBuilder()
		.setCustomId('connect')
		.setLabel('Connect')
		.setStyle(ButtonStyle.Primary);

		let deny = new ButtonBuilder()
		.setCustomId('deny')
		.setLabel('Deny')
		.setStyle(ButtonStyle.Danger);

		let leave = new ButtonBuilder()
		.setCustomId('leave')
		.setLabel('Leave')
		.setStyle(ButtonStyle.Danger);

		let row = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(connect, deny);

		let embed = new EmbedBuilder()
		.setTitle('Connection Request')
		.setAuthor({
			name: interaction.guild.name,
			iconURL: interaction.guild.iconURL() as string
		})
		.setDescription(`${interaction.user.username} sent a connection request${reason !== null ? `:\n"${reason}"` : ''}`);

		let res = await channel.send({ 
			components: [row],
			embeds: [embed]
		});

		// TODO: Implement select menu for moving channel

		let outBtnCollector = res.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3600000 });

		outBtnCollector.on('collect', async btn => {
			let reply = await btn.reply({ content: 'Joined.', ephemeral: true });
			setTimeout(() => reply.delete(), 5000);

			let postConnectEmbed = await res.edit({
				components: [row.setComponents(connect, leave)],
				embeds: [embed.addFields(
					{
						name: channel.guild.name, 
						value: btn.user.username,
						inline: true
					},
					{
						name: interaction.guild!.name,
						value: interaction.user.username,
						inline: true
					})
					.setTitle('Connection Established')],
			});

			if (outBtnCollector.collected.size === 1) {
				let received = await (interaction.channel as TextChannel).send({
					components: [row.setComponents(connect, leave)],
					embeds: [embed.setTitle('Connection Established').setDescription(null)]
				});

				let inBtnCollector = received.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3600000 });
				inBtnCollector.on('collect', async btn => {
					let reply = await btn.reply({ content: 'Joined.', ephemeral: true });
					setTimeout(() => reply.delete(), 5000);
				});
			}
		});
	}
}
