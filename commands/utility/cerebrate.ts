import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder, ComponentType, ChannelSelectMenuBuilder, ChannelType, InteractionCollector, ChannelSelectMenuInteraction, ButtonInteraction, Message } from "discord.js";

import { Nexus, Sojourn } from "../../utils/index.ts";

type NexusProps = {
	interaction: ChatInputCommandInteraction;
	nexus: Nexus;
}

export const command = {
	data: new SlashCommandBuilder()
	.setName('cerebrate')
	.setDescription('connect to an external server')
	.setDefaultMemberPermissions(0),
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

		inBtnCollector.on('collect', async inBtn => {
			let sojourn: Sojourn = {
				name: inBtn.user.username,
				guild: inBtn.guild!,
			}

			if (sojourn.guild === null) {
				throw new Error('Unable to parse user\'s guild.');
			}
			switch (inBtn.customId) {
				case 'deny' : {
					await res.edit({
						components: [row1.setComponents(connect.setDisabled(), deny.setDisabled())],
						embeds: [embed.setTitle(`Connection Request Rejected`).setDescription(`${embed.data.description}, **rejected by ${inBtn.user.username}**.`)]
					});
					await inBtn.reply('Connection rejected. Anonymity is given against the caller.');
					nexus.terminate();
					break;
				}
				case 'connect' : {
					if (nexus.inboundCollector === null) {
						throw new Error('Collector failed to initialize');
					}

					if (nexus.hasSojourn(sojourn)) {
						let reply = await inBtn.reply({ content: 'You\'ve already joined.', ephemeral: true });
						setTimeout(() => reply.delete(), 5000);
						return;
					}

					nexus.setSojourns(sojourn);

					if (inBtnCollector.collected.size > 1) {
						let embedData = embed.data;
						if (embedData === null) {
							throw new Error('Received nullish embed');
						}
						let embedDataFields = embed.data.fields ?? null;
						if (embedDataFields === null) {
							throw new Error('Received empty embed fields');
						}

						embedDataFields[0].value = `${embedDataFields[0].value}, ${inBtn.user.username}`
						await inBtn.update({
							embeds: [embed.setFields(embedDataFields[0], embedDataFields[1])]
						});

						if (outRes === null) {
							throw new Error('Outbound embed failed to construct.');
						}
						await outRes.edit({
							embeds: [embed.setFields(embedDataFields[0], embedDataFields[1])]
						});
						return;
					}

					let reply = await inBtn.reply({ content: 'Joined.', ephemeral: true, fetchReply: false });
					nexus.inboundCollector.on('collect', nexus.inCollectorFn);
					setTimeout(() => reply.delete(), 5000);
					break;
				}
				case 'relocate': {
					let relocation = await inBtn.update({
						components: [
							row1.setComponents(connect, leave, relocate.setDisabled()),
							row2,
						],
					})
					let menuSelectCollector: InteractionCollector<ChannelSelectMenuInteraction<'cached'>> = relocation.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, time: 300000 });
					menuSelectCollector.on('collect', async selection => {
						let selectedChannelId = selection.values[0];
						let selectedChannel: TextChannel | undefined = selection.channels.get(selectedChannelId) as TextChannel;

						if (!selectedChannel) return;

						let res = await relocation.fetch();

						let relocatedEmbed = selectedChannel.send({ 
							components: [row1.setComponents(connect, leave, relocate)],
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
					if (nexus.hasSojourn(sojourn) === false) {
						inBtn.reply({ content: `You have not joined.`, ephemeral: true });
						return;
					}
					await nexus.webhookController.remove(inBtn.user.username, nexus.getSourceChannel())
					.catch(err => {
						console.error(`ERR: ${err}\nThere may be no sojourns listed.`);
					});

					let embedData = embed.data;
					if (embedData === null) {
						throw new Error('Received nullish embed');
					}
					let embedDataFields = embed.data.fields ?? null;
					if (embedDataFields === null) {
						throw new Error('Received empty embed fields');
					}

					let pattern: RegExp = new RegExp(`(?:${inBtn.user.username}\, |\, ${inBtn.user.username}|${inBtn.user.username})`);

					embedDataFields[0].value = `${embedDataFields[0].value.replace(pattern, '')}`;

					if (embedDataFields[0].value.length < 1) {
						nexus.terminate();
						nexus.webhookController.eradicate();
						let isolatedField = embedDataFields[1];
						let inTermEmbed = await inBtn.update({
							embeds: [embed.setFields(isolatedField)],
							components: [
								row1.setComponents(connect.setDisabled(), leave.setDisabled(), relocate.setDisabled()),
							],
						})
						let inTermMsg = await inTermEmbed.fetch().then(res => res.reply({ content: `### Connection terminated by default\n-# Deleting <t:${Math.ceil(new Date().getTime() / 1000) + 10}:R>`   }));

						setTimeout(() => {
							inTermMsg.delete();
							inTermEmbed.delete();
						}, 10000);

						if (outRes === null) return;

						let outTermEmbed = await outRes.edit({ 
							embeds: [embed.setFields(isolatedField)],
							components: [
								row1.setComponents(connect.setDisabled(), leave.setDisabled(), relocate.setDisabled()),
							],
						});

						let outTermMsg = await outTermEmbed.reply({ content: `### Connection terminated by default\n-# Deleting <t:${Math.ceil(new Date().getTime() / 1000) + 10}:R>`   });

						setTimeout(() => {
							outTermMsg.delete();
							outTermEmbed.delete();
						}, 10000);
						return;
					}

					await inBtn.update({
						embeds: [embed.setFields(embedDataFields[0], embedDataFields[1])]
					});

					try {
						nexus.removeSojourn(sojourn);
					} catch (err) {
						console.error(err);
					}
					break;
				}
			}

			if (!(nexus.inboundCollector === null || nexus.inboundCollector.ended) && nexus.inboundCollector.collected.size === 1) {
				let postConnectEmbed = await res.edit({
					components: [
						row1.setComponents(connect, leave, relocate),
						// row2,
					],
					embeds: [embed.addFields(
						{
							name: targetChannel!.guild.name, 
							value: inBtn.user.username,
							inline: true
						},
						{
							name: interaction.guild!.name,
							value: interaction.user.username,
							inline: true
						})
						.setTitle('Connection Established')],
				}).then(() => nexus.setSojourns(sojourn, { name: interaction.user.username, guild: interaction.guild! }));

				outRes = await (nexus.getSourceChannel() as TextChannel).send({
					components: [row1.setComponents(connect, leave, relocate)],
					embeds: [embed.setTitle('Connection Established').setDescription(null)]
				});

				outBtnCollector = outRes.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3600000 });
				outBtnCollector.on('collect', async outBtn => {
					let sojourn: Sojourn = {
						name: outBtn.user.username,
						guild: outBtn.guild!,
					};

					if (sojourn.guild === null) {
						throw new Error('Cannot parse user\'s guild.');
					}

					switch (outBtn.customId) {
						case 'connect': {
							if (nexus.hasSojourn(sojourn)) {
								await outBtn.reply({ content: 'You\'ve already joined.', ephemeral: true });
								return;
							}

							nexus.setSojourns(sojourn);

							let reply = await outBtn.reply({ content: 'Joined.', ephemeral: true, fetchReply: false });

							let embedData = embed.data;
							if (embedData === null) {
								throw new Error('Received nullish embed');
							}
							let embedDataFields = embed.data.fields ?? null;
							if (embedDataFields === null) {
								throw new Error('Received empty embed fields');
							}
							console.log(`OLD VALUE: ${embedDataFields[0].value}`);
							embedDataFields[0].value = `${embedDataFields[0].value}, ${outBtn.user.username}`
							console.log(`OLD VALUE: ${embedDataFields[0].value}`);

							await outBtn.update({
								embeds: [embed.setFields(embedDataFields[0], embedDataFields[1])]
							});

							setTimeout(() => reply.delete(), 5000);
							break;
						}
						case 'relocate': {
							let relocation = await outBtn.update({
								components: [
									row1.setComponents(connect, leave, relocate.setDisabled()),
									row2,
								],
							})
							let menuSelectCollector: InteractionCollector<ChannelSelectMenuInteraction<'cached'>> = relocation.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, time: 300000 });
							menuSelectCollector.on('collect', async selection => {
								let selectedChannelId = selection.values[0];
								let selectedChannel: TextChannel | undefined = selection.channels.get(selectedChannelId) as TextChannel;

								if (!selectedChannel) return;

								let res = await relocation.fetch();

								let relocatedEmbed = selectedChannel.send({ 
									components: [row1.setComponents(connect, leave, relocate)],
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
							if (nexus.hasSojourn(sojourn) === false) {
								outBtn.reply({ content: `You have not joined.`, ephemeral: true });
								return;
							}

							let targetChannel = nexus.getChannelTarget();
							if (targetChannel === null) {
								throw new Error('Channel target is not initialized');
							}
							await nexus.webhookController.remove(outBtn.user.username, targetChannel)
							.catch(err => {
								console.error(`ERR: ${err}\nThere may be no sojourns listed.`);
							});

							let embedData = embed.data;
							if (embedData === null) {
								throw new Error('Received nullish embed');
							}
							let embedDataFields = embed.data.fields ?? null;
							if (embedDataFields === null) {
								throw new Error('Received empty embed fields');
							}

							let pattern: RegExp = new RegExp(`(?:${outBtn.user.username}\, |\, ${outBtn.user.username}|${outBtn.user.username})`);

							console.log(`OLD VALUE: ${embedDataFields[1].value}`);
							embedDataFields[1].value = `${embedDataFields[1].value.replace(pattern, '')}`;
							console.log(`NEW VALUE: ${embedDataFields[1].value}`);

							if (embedDataFields[1].value.length < 1) {
								nexus.terminate();
								nexus.webhookController.eradicate();

								let isolatedField = embedDataFields[0];

								let outTermEmbed = await outBtn.update({
									embeds: [embed.setFields(isolatedField)],
									components: [
										row1.setComponents(connect.setDisabled(), leave.setDisabled(), relocate.setDisabled()),
									],
								});

								let outTermMsg = await outTermEmbed.fetch().then(res => res.reply({ content: `### Connection terminated by default\n-# Deleting <t:${Math.ceil(new Date().getTime() / 1000) + 10}:R>`   }));

								setTimeout(() => {
									outTermEmbed.delete();
									outTermMsg.delete();
								}, 10000);

								if (outRes === null) return;

								let inTermEmbed = await res.fetch().then(res => res.edit({ 
									embeds: [embed.setFields(isolatedField)],
									components: [
										row1.setComponents(connect.setDisabled(), leave.setDisabled(), relocate.setDisabled()),
									],
								}));

								let inTermMsg = await inTermEmbed.reply({ content: `### Connection terminated by default\n-# Deleting <t:${Math.ceil(new Date().getTime() / 1000) + 10}:R>` });

								setTimeout(() => {
									inTermEmbed.delete();
									inTermMsg.delete();
								}, 10000);
								return;
							}

							try {
								nexus.removeSojourn(sojourn);
							} catch (err) {
								console.error(err);
							}


							await outBtn.update({
								embeds: [embed.setFields(embedDataFields[0], embedDataFields[1])]
							});

							await inBtn.update({
								embeds: [embed.setFields(embedDataFields[0], embedDataFields[1])]
							});
							break;
						}
					}
				});
			}
		});
	}
}
