import { ChatInputCommandInteraction, Collection, Guild, GuildMessageManager, Message, MessageCollector, PermissionsBitField, SlashCommandBuilder, TextChannel, Webhook } from "discord.js";
import { scheduler } from "timers/promises";

import { event as guildFetch } from '../../events/guildFetch.ts';
import { command as transmitReq } from './cerebrate.ts';

type GuildData = {
	name: string;
	id: string;
	defaultChannel: string | undefined;
}

// TODO: GENERAL IDENTITY AND ESTABLISH GUILD IDENTITY

export const command = {
	data: new SlashCommandBuilder()
	.setName('nexus')
	.setDescription('DANGEROUSLY sends content to guild(s)')
	// TODO: Add default options
	.addStringOption(guild => guild.setName('guild').setDescription('server to transmit').setRequired(true))
	.addStringOption(reason => reason.setName('reason').setDescription('the reason for contact')),
	async execute(interaction: ChatInputCommandInteraction) {
		let { guildData } = guildFetch;
		let guildInput: string | null = interaction.options.getString('guild');

		if (guildInput === null) throw new Error('Unparseable input.');

		let botId = interaction.applicationId;
		let targetGuild: Guild = guildData.filter(guild => guild.id === guildInput || guild.name.toLowerCase() === guildInput.toLowerCase())[0]?.data || null;

		if (targetGuild === null) return interaction.reply({ content: `Unable to find guild: ${guildInput}`, ephemeral: true });

		let targetChannel: TextChannel | null = null;
		targetChannel = targetGuild.systemChannel;

		if (targetChannel) {
			let permissions: Readonly<PermissionsBitField> | null = targetChannel.permissionsFor(botId);
			if (permissions === null) return;
			let sendable: boolean = permissions.has([PermissionsBitField.Flags.SendMessages]);
			if (!sendable) {
				for (let [_, channel] of targetGuild.channels.cache.entries()) {
					if (channel instanceof TextChannel && channel.name) {
						let permissions: Readonly<PermissionsBitField> | null = channel.permissionsFor(botId);
						if (permissions === null) return;
						let sendable: boolean = permissions.has([PermissionsBitField.Flags.SendMessages]);
						if (sendable) {
							targetChannel = channel;
							break;
						}
					}
				}
			}
			if (!targetChannel) throw new Error('Unable to find system / sendable channel');
			if (!interaction.channel) throw new Error('Unable to find caller\'s channel');

			// Initialize multi-collector logic
			let [outCollector, inCollector]: [MessageCollector | null, MessageCollector | null] = [new MessageCollector(interaction.channel), new MessageCollector(targetChannel)];

			// Create connection request
			let reason = interaction.options.getString('reason') || null;

			// TODO: Store members to allow multiple
			// TODO: Add member containment
			let outWebhook: Webhook | null = null;
			let inWebhook: Webhook | null = null;

			// Type?
			let outCollectorFn: (args_0: Message<boolean>, args_1: Collection<string, Message<boolean>>) => void = async (msg: Message) => {
				if (msg.author.bot) return;
				if (!outWebhook) {
					outWebhook = await targetChannel!.createWebhook({ 
						name: msg.author.username,
						avatar: msg.author.displayAvatarURL(),
					});
				}
				await outWebhook.send({
					content: msg.content,
					files: [...msg.attachments.values() || null],
				});
				if (msg.content === '$cancel') {
					(interaction.channel as TextChannel).send('Connection terminated.');
					targetChannel!.send('Connection terminated.');
					outWebhook.delete();
					if (inWebhook) {
						inWebhook.delete();
					}
					outCollector.stop();
				}
			};

			let resetOutCollector = (collector: MessageCollector, channel: TextChannel): MessageCollector => {
				collector.stop();
				let newCollector = new MessageCollector(channel);
				newCollector.on('collect', outCollectorFn);
				return newCollector;
			}

			let reset = (collector: Parameters<typeof resetOutCollector>[0], channel: Parameters<typeof resetOutCollector>[1]): ReturnType<typeof resetOutCollector> => {
				targetChannel = channel;
				console.log(`Received Arguments: ${channel.name}\nUpdated value: ${targetChannel?.name}`);
				return resetOutCollector(collector, collector.channel as TextChannel);
			}

			transmitReq.execute({ interaction, targetChannel, reason, outCollector, inCollector, outWebhook, inWebhook }, reset);

			outCollector.on('collect', outCollectorFn);

			inCollector.on('collect', async (msg: Message) => {
				if (msg.author.bot) return;
				if (!inWebhook) {
					inWebhook = await (interaction.channel as TextChannel)!.createWebhook({ 
						name: msg.author.username,
						avatar: msg.author.displayAvatarURL(),
					});
				}
				await inWebhook.send({
					content: msg.content,
					files: [...msg.attachments.values() || null],
				});
				if (msg.content === '$cancel') {
					targetChannel!.send('Connection terminated.');
					(interaction.channel as TextChannel).send('Connection terminated.');
					inWebhook.delete();
					if (outWebhook) {
						outWebhook.delete();
					}
					outCollector.stop();
				}
			});

			interaction.reply(`Connected to server: ${guildInput}`);

			// let webhook = await targetChannel.createWebhook({ 
			// 	name: '\u{01CBC}',
			// 	avatar: 'https://www.sonoranspice.com/cdn/shop/files/UnderwoodRanchesSrirachaFront_comp_2000x.jpg?v=1692125376',
			// });
			// let msg = await webhook.send(`Test`);
			// let reply = await interaction.reply({ content: 'Sent.', ephemeral: true });
			// webhook.delete();
			// await scheduler.wait(5000);
			// reply.delete();
		}


		/** Fetch Msgs
		 * let channelMsgs: GuildMessageManager | Collection<string, Message<true>> = targetChannel.messages;
		 * let str: string[] = [];
		 * await channelMsgs.fetch({ limit: 5 }).then(messages => {
		 * 	messages.forEach(msg => { 
		 * 		str.push(msg.content);
		 * 	})
		 * });
		 * str = str.filter(line => line.length > 0);
		 * interaction.reply(str.reduce((p, n) => `${p}\n${n}`));
		 */
	}
}
