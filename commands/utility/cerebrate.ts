import { ChatInputCommandInteraction, SlashCommandBuilder, MessageCollector, TextChannel } from "discord.js";

export const command = {
	data: new SlashCommandBuilder()
	.setName('cerebrate')
	.setDescription('connect to an external server'),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.channel) return;

		let collector: MessageCollector = new MessageCollector(interaction.channel, { filter: msg => msg.author.bot === false });

		interaction.reply("Collector initialized.");

		let str: string = '';

		collector.on('collect', msg => {
			if (collector.collected.size >= 5) collector.stop();

			for (let [_, msg] of collector.collected.entries()) {
					str += `${msg.content}\n`
			}
		});
		console.log(str);
		// TODO: FIX COLLECTION OUTPUT
		collector.on('end', collected => (interaction.channel as TextChannel).send(`Collector terminated: \n${str}`));
	}
}
