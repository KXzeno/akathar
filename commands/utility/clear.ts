import { ChatInputCommandInteraction, Collection, GuildMessageManager, Message, SlashCommandBuilder, TextChannel } from "discord.js";

export const command = {
	data: new SlashCommandBuilder()
	.setName('clear')
	.addNumberOption(num => num.setName('count').setDescription('specify a number of bot messages for Karnovah to clear'))
	.setDescription('clears previous bot outputs'),
	async execute(interaction: ChatInputCommandInteraction) {
		let channel: TextChannel | null = interaction.channel as TextChannel;
		if (!channel) {
			throw new Error('Unable to send through caller\'s channel');
		}

		let numToClear: number | null = interaction.options.getNumber('count');

		let channelMsgs: GuildMessageManager | Collection<string, Message<true>> = channel.messages;
		let msgRef = interaction.reply({ content: 'Clearing...', ephemeral: true });
		await channelMsgs.fetch({ limit: numToClear ??= 10, cache: false }).then(messages => {
			messages.forEach(msg => { 
				if (msg.author.bot) {
					msg.delete();
				}
			})
		});
		msgRef.then(msg => msg.delete());
	}
}
