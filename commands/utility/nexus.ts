import { ChatInputCommandInteraction, Collection, Guild, GuildMessageManager, Message, MessageCollector, PermissionsBitField, SlashCommandBuilder, TextChannel, Webhook } from "discord.js";
import { scheduler } from "timers/promises";

import { event as guildFetch } from '../../events/guildFetch.ts';
import { command as transmitReq } from './cerebrate.ts';

type GuildData = {
	name: string;
	id: string;
	defaultChannel: string | undefined;
}

export const command = {
	data: new SlashCommandBuilder()
	.setName('nexus')
	.setDescription('DANGEROUSLY sends content to guild(s)')
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

			// Create connection request
			let reason = interaction.options.getString('reason') || null;
			transmitReq.execute(interaction, targetChannel, reason);

			// Create multi-collector logic
			let [outCollector, inCollector]: [MessageCollector, MessageCollector] = [new MessageCollector(interaction.channel), new MessageCollector(targetChannel)];
			let outWebhook: Webhook | null;
			let inWebhook: Webhook | null;
			outCollector.on('collect', async (msg: Message) => {
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
			});

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
