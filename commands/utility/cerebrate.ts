import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder, MessageCollector, ComponentType, ChannelSelectMenuBuilder, ChannelType, InteractionCollector, ChannelSelectMenuInteraction, ButtonInteraction, Webhook, Message, Collection } from "discord.js";

import { Nexus } from "../../utils/index.ts";

type NexusProps = {
	interaction: ChatInputCommandInteraction;
	nexus: Nexus;
}

export const command = {
	data: new SlashCommandBuilder()
	.setName('cerebrate')
	.setDescription('connect to an external server'),
	async execute(props: NexusProps) {
		let { interaction, nexus } = props;
		if (!interaction.guild) throw new Error('Caller\'s guild undetected.');
		let targetChannel = nexus.getChannelTarget();
		if (targetChannel === null) throw new Error('No channel target');

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
		.setDescription(`${props.interaction.user.username} sent a connection request${nexus.getReason() !== null ? `:\n"${nexus.getReason()}"` : ''}`);

		let channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId('channels')
		.setPlaceholder('Relocate the message collector')
		.addChannelTypes([ChannelType.GuildText]);

		let row2 = new ActionRowBuilder<ChannelSelectMenuBuilder>()
		.addComponents(channelSelect);

		let res = await targetChannel.send({ 
			components: [row1],
			embeds: [embed]
		});

		let outRes: Message<true> | null = null;
		let outBtnCollector: InteractionCollector<ButtonInteraction<'cached'>> | null = null; 

		let inBtnCollector: InteractionCollector<ButtonInteraction<'cached'>> = res.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3600000 });

		inBtnCollector.on('collect', async btn => {
			switch (btn.customId) {
				case 'connect' : {
					if (nexus.inboundCollector === null) {
						throw new Error('Collector failed to initialize');
					}
					let reply = await btn.reply({ content: 'Joined.', ephemeral: true });
					nexus.inboundCollector.on('collect', nexus.inCollectorFn);
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
						if (nexus.outboundCollector === null) {
							throw new Error('Outbound collecor not initialized');
						}
						targetChannel /*= nexus.outboundCollector.channel*/ = props.nexus.setChannelTarget(selectedChannel);
						// Reset collector
						await nexus.redirectOutboundCollector(nexus.getSourceChannel());
						// Actual redirect
						await nexus.redirectInboundCollector({ newChannel: selectedChannel });
						let notice = await selection.reply({ content: `Moved to <#${selectedChannelId}>\n-# Deleting <t:${Math.ceil(new Date().getTime() / 1000) + 5}:R>` });
						menuSelectCollector.stop();
						setTimeout(async () => {
							await relocation.delete();
							await notice.delete();
						}, 5000);
					});
					break;
				}
				case 'leave': {
					break;
				}
			}

			if (inBtnCollector.collected.size === 1) {
				let postConnectEmbed = await res.edit({
					components: [
						row1.setComponents(connect, leave, relocate),
						// row2,
					],
					embeds: [embed.addFields(
						{
							name: targetChannel!.guild.name, 
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

				outRes = await (nexus.getSourceChannel() as TextChannel).send({
					components: [row1.setComponents(connect, leave, relocate)],
					embeds: [embed.setTitle('Connection Established').setDescription(null)]
				});

				outBtnCollector = outRes.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3600000 });
				outBtnCollector.on('collect', async btn => {
					switch (btn.customId) {
						case 'join': {
							btn.channel?.send('You used \'Join\'');
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
								if (nexus.outboundCollector === null) {
									throw new Error('Outbound collecor not initialized');
								}
								// Actual redirect
								let prevSourceChannel = nexus.getSourceChannel();
								await nexus.redirectOutboundCollector(selectedChannel);
								// Reset collector
								let targetChannel = nexus.getChannelTarget();
								if (targetChannel === null || prevSourceChannel === null) {
									throw new Error('No channel target');
								}
								await nexus.redirectInboundCollector({ newChannel: selectedChannel, prevSourceChannel });
								let notice = await selection.reply({ content: `Moved to <#${selectedChannelId}>\n-# Deleting <t:${Math.ceil(new Date().getTime() / 1000) + 5}:R>` });
								menuSelectCollector.stop();
								setTimeout(async () => {
									await relocation.delete();
									await notice.delete();
								}, 5000);
							});
							break;
						}
						case 'leave': {
							btn.channel?.send('You used \'Leave\'');
							break;
						}
					}
				});
			}
		});
	}
}
