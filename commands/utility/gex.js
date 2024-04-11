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
			.setThumbnail('https://media.giphy.com/media/5YrT02HhIpbiqFbF4j/giphy.gif')
			.setTimestamp()
			.setFooter({ text: 'Make sure you have DMs enabled' });

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

		const validate = new ButtonBuilder()
			.setCustomId('validate')
			.setLabel('Validate')
			.setStyle(ButtonStyle.Secondary);

		const row = new ActionRowBuilder()
			.addComponents(join, cancel);

		let res = await interaction.reply({
			content: `${interaction.user} opened the gift exchange pool, join below if interested.`,
			components: [row],
			embeds: [embed]
		});

		let collector = res.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });
		let users = {};

		function getRandomIndex(arr) {
			return Math.floor(Math.random() * arr.length);
		}

		let randomizeArr = (arr) => {
			//TODO: Implement currying if possible 
			let [usedIndexes, newArr] = [[], []];
			for (let val of arr.values()) {
				let index = getRandomIndex(arr)
				let repeated = usedIndexes.find(i => i === index);
				while (typeof repeated !== undefined) {
					index = getRandomIndex(arr);
					let nextRepeated = usedIndexes.find(i => i === index);
					if (index !== nextRepeated) {
						break;
					}
				}
				newArr[index] = val;
				usedIndexes.push(index);
			}
			return newArr;
		}

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
					if (i.user !== interaction.user) {
						return i.reply({ content: 'Only the prompter may do this.', ephemeral: true });
					}

					i.update({
						content: 'Operation Cancelled.',
						components: [],
						embeds: [],
					});
					break;
				case 'finalize':
					if (i.user !== interaction.user) {
						return i.reply({ content: 'Only the prompter may do this.', ephemeral: true });
					}

					let fieldsArr = [...embed.data.fields.flatMap(({ name }) => !!name ? [`${name}`] : undefined)];
					let randomizedFieldsArr = randomizeArr(fieldsArr);

					if (fieldsArr.length < 2) {
						return i.reply({ content: 'Cannot start with one user.', ephemeral: true });
					}

					randomizedFieldsArr.forEach((name, i, names) => {
						if (i === names.length - 1) {
							return users[name].send(`You've been assigned ${randomizedFieldsArr[0]}`);
						}

						users[name].send(`You've been assigned ${randomizedFieldsArr[i + 1]}`);
					});
					try {
						//await i.deferReply()
						await i.update({
							components: [
								new ActionRowBuilder().addComponents(
									join.setDisabled(true),
									finalize.setDisabled(true),
									cancel.setDisabled(true),
									validate
								),
							],
						});
						await i.followUp('Names were directly sent to your PMs.'); 
					} catch (err) {
						console.error(err);
					}
					break;
				case 'validate': 
					i.reply('yo');
			}
		});
	},
};
