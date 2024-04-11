// Will be refactored using TypeScript, and I plan to use 
// databases and query languages in the future for 
// performance and scalability reasons

/* Local Imports */
import { scheduler } from 'node:timers/promises';
import { ComponentType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';

// Build deployable command 
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

		// Constructs interactive buttons
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

		// Initial interaction response
		let res = await interaction.reply({
			content: `${interaction.user} opened the gift exchange pool, join below if interested.`,
			components: [row],
			embeds: [embed]
		});

		// Construct collector to listen for future interactions
		let collector = res.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 }); //1 hour

		/** State variables
		 * @typedef {Object} users - stores reference for pending responses
		 * @type {Array} fieldsArr - transforms users data into a shallow instance
		 * @typedef {Object} linkedUsers - previous to next relationship via key and value
		 * @typedef {Object} validateList - semi-maniputable list used for comparison
		 * @typedef {Object} validator - immutable list to validate uniqueness of validateList
		 * @author Kx
		 */
		let [users, fieldsArr, linkedUsers, validateList, validator] = [{}, [], {}, new Set(), new Map()];

		/**
		 * Global-scoped object mutation
		 * @typedef {Object} user - User on interaction
		 * @property {string} username - Username on interaction
		 * @author Kx
		 */
		async function updateLinkedUsers({ username }, matchedUser) {
			validateList.add({ [username]: matchedUser });
			Object.defineProperty(linkedUsers, username, {
				value: matchedUser,
				enumerable: true,
			});
		}

		/**
		 * Obtain a random index
		 * @param {Array} arr - Array to index from
		 * @returns {number} - A pseudo-random index
		 * @author Kx
		 */
		function getRandomIndex(arr) {
			return Math.floor(Math.random() * arr.length);
		}

		/**
		 * Repositions the contents of an array without malformation
		 * @param {Array} arr - Array to reposition contents of
		 * @returns {Array} newArr - a shallow copy of the modified array
		 * @author Kx
		 */
		let randomizeArr = (arr) => {
			//TODO: Implement currying if possible 
			/** Function-scope variables
			 * @type {Array} usedIndexes - ensures a unique index on new iteration
			 * @returns {Array} newArr - modified array 
			 * @author Kx
			 */
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

		// Used to 'collect' interactions
		collector.on('collect', async i => {
			/** Global-scope variables
			 * @typedef {Object} tempObj - stores digital prints of user for validation
			 * @property {Object} ...embed.data.fields - a shallow copy of embed data
			 * @type {boolean} validateRepeat - validates repeated interactions
			 */
			let [tempObj, validateRepeat] = [embed.data.fields ?? undefined, false];

			tempObj !== undefined && tempObj.forEach(user => {
				if (i.user.username === user.name) {
					return validateRepeat = true;
				}
			});

			// Conditional statement separating each button's interaction and concerns
			switch(i.customId) {
				case 'join':
					/**
					 * Returns an updated embed or an ephemeral msg indicating unauthorization
					 * @returns {} - Object mutation || interaction response
					 * @author Kx
					 */
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
					/**
					 * Returns deletion of initial response
					 * @returns {} - Object mutation || interaction response
					 * @author Kx
					 */
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
					/**
					 * Compiles acquired users into pairs using prev -> next algorithm, or linked list
					 * @returns {} A method sending user matches || ephemeral msg indicating error
					 * @author Kx
					 */
					if (i.user !== interaction.user) {
						return i.reply({ content: 'Only the prompter may do this.', ephemeral: true });
					}

					fieldsArr = [...embed.data.fields.flatMap(({ name }) => !!name ? [`${name}`] : undefined)];
					let randomizedFieldsArr = randomizeArr(fieldsArr);

					if (fieldsArr.length < 2) {
						return i.reply({ content: 'Cannot start with one user.', ephemeral: true });
					}

					randomizedFieldsArr.forEach(async (name, index, names) => {
						if (index === names.length - 1) {
							let headUser = randomizedFieldsArr[0];
							await updateLinkedUsers(users[name], headUser);
							return users[name].send(`You've been assigned ${headUser}`);
						}
						let assigned = randomizedFieldsArr[index + 1];
						await updateLinkedUsers(users[name], assigned);
						users[name].send(`You've been assigned ${assigned}`);
					});

					try {
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
					/**
					 * Validation
					 * @see {@link https://javascript.info/map-set}
					 * @returns {} Validation response || Error msg indicating mismatch
					 * @author Kx
					 */

					let validatePassed;
					let validatedUsers = [];
					let defaultMsg = 'Validating using Map and Set transformations...\n';
					await i.deferReply()
					// keys = values in Sets
					for (let [,val] of validateList.entries()) {
						let [fetchedKey, fetchedValue] = 
							[Object.keys(val)[0], Object.values(val)[0]];
						validatePassed = true;
						validator.set(fetchedKey, fetchedValue);
						validatedUsers.push(`${fetchedValue} :dart:\n`);
						await scheduler.wait(2_000);
						await i.editReply(defaultMsg + validatedUsers.toString().replaceAll(',',''));
					}
					//	let subset = new Set({[fetchedKey]: fetchedValue})
					//	console.log(({[fetchedKey]: fetchedValue}).isSubsetOf(validateList));
					if (validator.size !== validateList.size) { /*validateList.has({[fetchedKey]: fetchedValue*/
						validatePassed = false;
						let warningMsg = 'WARNING: Possibilty of mismatch, contact @kaeon_.'
						console.log(validator.size, validateList.size);
						await i.followUp(warningMsg);
						await scheduler.wait(3_000);
						return await i.editReply(`${warningMsg} Advanced exception handling has not yet been implemented.`);
					}
					await scheduler.wait(3_000)
					console.log(validatedUsers.sort((prev, next) => prev.localeCompare(next)).toString());
					validatePassed && await i.editReply(`${defaultMsg}${validatedUsers.sort((prev, next) => prev.localeCompare(next)).toString().replaceAll(',','')}\nSuccess. *Note: this is an alphabetical sort and is not related at all to how you were matched. Stay frosty.*`);
					break;
			}
		});
	},
};
