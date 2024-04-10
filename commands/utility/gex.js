import { ComponentType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';

export const command = {
	data: new SlashCommandBuilder()
	.setName('gex')
	.setDescription('gift exchange event'),
	async execute(interaction) {
		let embed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Gift Exchange')
			.setDescription('Participants:')
			.setAuthor({ name: `Initiated by ${interaction.user.username}`, iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}` })
		;

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
		let users = {};

		let randomize = (arr) => Math.floor(Math.random() * arr.length);

		collector.on('collect', async i => {
			let [tempObj, validateRepeat] = [embed.data.fields ?? undefined, false];

		 	tempObj !== undefined && tempObj.forEach(user => {
		 		if (i.user.username === user.name) {
					return validateRepeat = true;
				}
			});

			switch(i.customId) {
				case 'join':
					!validateRepeat
						? +(async () => {
							await i.update({
								components: [new ActionRowBuilder().addComponents(join, finalize, cancel)],
								embeds: [embed.addFields({name: `${i.user.username}`, value: `${i.user}`, inline: true})]
							});
							Object.defineProperties(users, {
								[i.user.username]: {
									value: i.user,
									enumerable: true,
								},
							});

							validateRepeat = false;
						})()
						: +(async () => {
							validateRepeat = true; 
							i.reply({ content: `You already registered, ${i.user}`, ephemeral: true});
						})();
					break;
				case 'cancel':
					i.update({
						content: 'Operation Cancelled.',
						components: [],
						embeds: [],
					});
					break;
				case 'finalize':
					let fieldsArr = [...embed.data.fields.flatMap(({ name }) => !!name ? [`${name}`] : undefined)];
					if (fieldsArr.length < 2) {
						return i.reply({ content: 'Cannot start with one user.', ephemeral: true });
					}

					tempObj.forEach(({ name }) => {
						// Handle case where user receives his own id
						let filteredArr = fieldsArr.filter((str) => str !== users[name].username);
						let assigned = filteredArr[randomize(filteredArr)];
						console.log(fieldsArr, filteredArr, assigned);
						users[name].send(`You've been assigned ${assigned}`);
						filteredArr.shift();
					});
					i.reply('Names were directly sent to your PMs.');
					break;
			}
		});
	},
};
