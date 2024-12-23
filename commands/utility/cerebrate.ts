import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder, MessageCollector, ComponentType, ChannelSelectMenuBuilder, ChannelType, InteractionCollector, ChannelSelectMenuInteraction, ButtonInteraction } from "discord.js";

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

		let relocate = new ButtonBuilder()
		.setCustomId('relocate')
		.setLabel('Relocate')
		.setStyle(ButtonStyle.Secondary);

		let row1 = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(connect, deny);

		let embed = new EmbedBuilder()
		.setTitle('Connection Request')
		.setAuthor({
			name: interaction.guild.name,
			iconURL: interaction.guild.iconURL() as string
		})
		.setDescription(`${interaction.user.username} sent a connection request${reason !== null ? `:\n"${reason}"` : ''}`);

		let channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId('channels')
		.setPlaceholder('Relocate the message collector')
		.addChannelTypes([ChannelType.GuildText]);

		let row2 = new ActionRowBuilder<ChannelSelectMenuBuilder>()
		.addComponents(channelSelect);

		let res = await channel.send({ 
			components: [row1],
			embeds: [embed]
		});

		// TODO: Implement select menu for moving channel

		let outBtnCollector: InteractionCollector<ButtonInteraction<'cached'>> = res.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3600000 });

		outBtnCollector.on('collect', async btn => {
			switch (btn.customId) {
				case 'connect' : {
					let reply = await btn.reply({ content: 'Joined.', ephemeral: true });
					setTimeout(() => reply.delete(), 5000);
					break;
				}
				case 'relocate': {
					let relocation = await btn.update({
						components: [
							row1.setComponents(connect, leave, relocate.setDisabled()),
							row2,
						],
					})
					let menuSelectCollector: InteractionCollector<ChannelSelectMenuInteraction<'cached'>> = relocation.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, time: 300000 });
					menuSelectCollector.on('collect', selection => {
						let selectedChannelId = selection.values[0];
						let selectedChannel: TextChannel | undefined = selection.channels.get(selectedChannelId) as TextChannel;
						//
						// TODO: Check if sendable
						if (!selectedChannel) return;

						selectedChannel.send('Relocated here.');
					});
					break;
				}
			}

			if (outBtnCollector.collected.size === 1) {
				let postConnectEmbed = await res.edit({
					components: [
						row1.setComponents(connect, leave, relocate),
						// row2,
					],
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

				let received = await (interaction.channel as TextChannel).send({
					components: [row1.setComponents(connect, leave, relocate)],
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
