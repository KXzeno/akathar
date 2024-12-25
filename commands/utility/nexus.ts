import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { Nexus } from "../../utils/index.ts";
import { command as transmitReq } from './cerebrate.ts';

// TODO: IMPLEMENT GENERAL IDENTITY AND ESTABLISH GUILD IDENTITY GUILD LIST
// TODO: IMPLEMENT GUILD LIST STATUSES
//         - LOCKED / UNLOCKED / LIMITED
// TODO: Create visual for termination

export const command = {
	data: new SlashCommandBuilder()
	.setName('nexus')
	.setDescription('DANGEROUSLY sends content to guild(s)')
	// TODO: Add default options
	.addStringOption(guild => guild.setName('guild').setDescription('server to transmit').setRequired(true))
	.addStringOption(reason => reason.setName('reason').setDescription('the reason for contact')),
	async execute(interaction: ChatInputCommandInteraction) {
		let guildInput: string | null = interaction.options.getString('guild');

		if (guildInput === null) {
			throw new Error('Unparseable input.');
		}

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

			if (!targetChannel) {
				throw new Error('Unable to find system / sendable channel');
			}

			let sourceChannel = nexus.getSourceChannel();

			if (!sourceChannel) {
				throw new Error('Unable to find caller\'s channel');
			}

			transmitReq.execute({ interaction, nexus });

			if (nexus.outboundCollector === null) {
				throw new Error('Outbound collector not initialized');
			}

			if (nexus.inboundCollector === null) {
				throw new Error('Inbound collector not initialized');
			}

			nexus.outboundCollector.on('collect', nexus.outCollectorFn);


			interaction.reply(`Connected to server: ${guildInput}`);
		}
	}
}
