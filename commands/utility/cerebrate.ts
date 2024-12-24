import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder, MessageCollector, ComponentType, ChannelSelectMenuBuilder, ChannelType, InteractionCollector, ChannelSelectMenuInteraction, ButtonInteraction, Webhook } from "discord.js";

type NexusProps = {
	interaction: ChatInputCommandInteraction;
	channel: TextChannel;
	reason: string | null;
	outCollector: MessageCollector;
	inCollector: MessageCollector;
	outWebhook: Webhook | null;
	inWebhook: Webhook | null;
}

export const command = {
	data: new SlashCommandBuilder()
	.setName('cerebrate')
	.setDescription('connect to an external server'),
	async execute(props: NexusProps) {
		if (!props.interaction.guild) throw new Error('Caller\'s guild undetected.');

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
			name: props.interaction.guild.name,
			iconURL: props.interaction.guild.iconURL() as string
		})
		.setDescription(`${props.interaction.user.username} sent a connection request${props.reason !== null ? `:\n"${props.reason}"` : ''}`);

		let channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId('channels')
		.setPlaceholder('Relocate the message collector')
		.addChannelTypes([ChannelType.GuildText]);

		let row2 = new ActionRowBuilder<ChannelSelectMenuBuilder>()
		.addComponents(channelSelect);

		let res = await props.channel.send({ 
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
					menuSelectCollector.on('collect', async selection => {
						let selectedChannelId = selection.values[0];
						let selectedChannel: TextChannel | undefined = selection.channels.get(selectedChannelId) as TextChannel;

						// TODO: Check if sendable
						if (!selectedChannel) return;

						let res = await relocation.fetch();

						let relocatedEmbed = selectedChannel.send({ 
							components: [row1.setComponents(connect, leave)],
							embeds: res.embeds
						});

						if (selection.channel === null) return;

						// Update nexus variables
						props.channel = props.inCollector.channel = selectedChannel;
						props.inWebhook = null;

						let notice = await selection.reply({ content: `Moved to <#${selectedChannelId}>\n-# Deleting <t:${Math.ceil(new Date().getTime() / 1000) + 5}:R>` });
						menuSelectCollector.stop();
						setTimeout(async () => {
							await relocation.delete();
							await notice.delete();
						}, 5000);
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
							name: props.channel.guild.name, 
							value: btn.user.username,
							inline: true
						},
						{
							name: props.interaction.guild!.name,
							value: props.interaction.user.username,
							inline: true
						})
						.setTitle('Connection Established')],
				});

				let received = await (props.interaction.channel as TextChannel).send({
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
