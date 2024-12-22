import { ChatInputCommandInteraction, Collection, Guild, GuildMessageManager, Message, PermissionsBitField, SlashCommandBuilder, TextChannel } from "discord.js";

import { event as guildFetch } from '../../events/guildFetch.ts';

type GuildData = {
	name: string;
	id: string;
	defaultChannel: string | undefined;
}

export const command = {
	data: new SlashCommandBuilder()
	.setName('nexus')
	.setDescription('DANGEROUSLY sends content to guild(s)'),
	async execute(interaction: ChatInputCommandInteraction) {
		let { guildData } = guildFetch;
		let targetGuild: Guild = guildData.filter(guild => guild.name === 'Skuldafn')[0].data;
		let targetChannel: TextChannel | null = null;
		let intChannel = interaction.channel as TextChannel;
		let botId = interaction.applicationId;
		targetGuild.channels
		for (let [_, channel] of targetGuild.channels.cache.entries()) {
			if (channel instanceof TextChannel && channel.name) {
				let permissions: Readonly<PermissionsBitField> | null = channel.permissionsFor(botId);
				if (permissions === null) return;
				let sendable: boolean = permissions.has([PermissionsBitField.Flags.SendMessages]);
				if (sendable) {
					targetChannel = channel;
					console.log(channel.name);
				}
			}
		}
		if (!targetChannel) return interaction.reply({ content: 'Unable to find sendable channels.', ephemeral: true });
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
