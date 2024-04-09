import { ComponentType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('gex')
	.setDescription('gift exchange event'),
	async execute(interaction) {
		let embed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Gift Exchange')
			.setDescription('Participants:');

		const join = new ButtonBuilder()
			.setCustomId('join')
			.setLabel('Join')
			.setStyle(ButtonStyle.Primary);

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Secondary);

		const finalize = new ButtonBuilder()
			.setCustomId('finalize')
			.setLabel('Compile')
			.setStyle(ButtonStyle.Danger);

		const row = new ActionRowBuilder()
			.addComponents(join, cancel);

		let res = await interaction.reply({
			content: `${interaction.user} opened the gift exchange pool, join below if interested.`,
			components: [row],
			embeds: [embed]
		});

		let collector = res.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });

		collector.on('collect', async i => {
			let [tempObj, validateRepeat] = [embed.data.fields ?? undefined, false];
			console.log(tempObj);
		 	tempObj !== undefined && tempObj.forEach(user => {
		 		if (interaction.user.username === user.name) {
		 			return validateRepeat = true;
		 		}
		 	});

			console.log(i);

		 	!validateRepeat
		 		? +(async () => await i.update({
					components: [new ActionRowBuilder().addComponents(join, finalize, cancel)],
					embeds: [embed.addFields({name: `${interaction.user.username}`, value: `${interaction.user}`, inline: true})]
		 	}))()
		 		: +(async () => {
					validateRepeat = true; 
					i.reply(`You already registered, ${interaction.user}`);
				})();
		 });
	},
};
