import { ComponentType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('tentative')
	.setDescription('exception handling command'),
	async execute(interaction) {
//		let embed = new EmbedBuilder();

		const test = new ButtonBuilder()
			.setCustomId('test')
			.setLabel('test')
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder()
			.addComponents(test);

		let res = await interaction.reply({
			content: `For testing purposes`,
			components: [row],
//			embeds: [embed]
		});

		let collector = res.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });

		collector.on('collect', async i => {
			i.reply(`${i.user} vs ${interaction.user}`);

		});
	},
};

