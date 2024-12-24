import { ChatInputCommandInteraction, Collection, Guild, Message, MessageCollector, PermissionsBitField, SlashCommandBuilder, TextChannel, Webhook } from "discord.js";

import { Nexus } from "../../utils/Nexus.ts";
import { event as guildFetch } from '../../events/guildFetch.ts';
import { command as transmitReq } from './cerebrate.ts';
import { WebhookManager } from "../../utils/index.ts";

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

		let guildInput: string | null = interaction.options.getString('guild');
		if (guildInput === null) throw new Error('Unparseable input.');

		// Create connection request
		let reason = interaction.options.getString('reason') || null;

		let nexus = new Nexus(interaction, guildInput, reason);
		let targetChannel = nexus.getChannelTarget();
		if (targetChannel) {
			let sendable = nexus.isChannelSendable(targetChannel);
			if (!sendable) {
				nexus.assertiveSearchDefaultChannel();
				targetChannel = nexus.getChannelTarget();
			}

			if (!targetChannel) throw new Error('Unable to find system / sendable channel');
			if (!interaction.channel) throw new Error('Unable to find caller\'s channel');

			let webhooks = new WebhookManager();

			// Type?
			let outCollectorFn: (args_0: Message<boolean>, args_1: Collection<string, Message<boolean>>) => void = async (msg: Message) => {
				if (msg.author.bot) return;
				if (await webhooks.has(msg.author.username, targetChannel as TextChannel) === false) {
					await webhooks.add(msg, targetChannel as TextChannel);
				}
				let webhook = webhooks.get(msg.author.username, targetChannel as TextChannel);
				// console.log(`From ${msg.channel} to ${targetChannel}, outbound`);
				await WebhookManager.fire(webhook, msg);

				if (msg.content === '$cancel') {
					Nexus.terminate(nexus);
					webhooks.eradicate();
				}
			};

			transmitReq.execute({ interaction, nexus, targetChannel, reason });
			if (nexus.outboundCollector === null) {
				throw new Error('Outbound collector not initialized');
			}

			if (nexus.inboundCollector === null) {
				throw new Error('Inbound collector not initialized');
			}

			nexus.outboundCollector.on('collect', outCollectorFn);

			nexus.inboundCollector.on('collect', async (msg: Message) => {
				if (msg.author.bot) return;
				if (await webhooks.has(msg.author.username, interaction.channel as TextChannel) === false) {
					await webhooks.add(msg, interaction.channel as TextChannel);
				}
				// console.log(`From ${msg.channel} to ${interaction.channel}, inbound`);
				await WebhookManager.fire(webhooks.get(msg.author.username, interaction.channel as TextChannel), msg);
				if (msg.content === '$cancel') {
					Nexus.terminate(nexus);
					webhooks.eradicate();
				}
			});

			interaction.reply(`Connected to server: ${guildInput}`);
		}
	}
}
