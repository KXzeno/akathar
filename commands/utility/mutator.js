import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const command = {
  data: new SlashCommandBuilder()
  .setName('mutator')
  .setDescription('identifies sc2 mutators'),
  async execute(interaction) {
    let data = await fetch('https://docs.google.com/spreadsheets/d/1NvYbNvHkivOKJ9vWf9EneXxvwMlCC4nkjqHlv6OCRQo/export?format=csv&gid=0');
    let mutationData = undefined;
    let mutatorField = [];

    if (data !== undefined) {
      try {
        data = await data.text().then(res => res.split('\n'));
        // TODO: Get current week parsing logic
        let mutation = data[448].split(',');
        let mutators = [mutation[7], mutation[8], mutation[9]].filter(title => title.length >= 1);
        mutationData = {
          id: mutation[0],
          data: mutation[1],
          name: mutation[2],
          map: mutation[3],
          mutators: mutators,
          choice: mutation[11].replaceAll(/(?:[\[\]])/g, ''),
          difficulty: mutation[13],
          rating: mutation[14],
        }

        for (let i = 0; i < mutationData.mutators.length; i++) {
          mutatorField.push({ name: `Mutator ${i + 1}`, value: mutationData.mutators[i], inline: true });
        }
        console.log('Mutator Field: ', ...mutatorField);
        console.log(mutationData);
      } catch (e) {
        console.log(`ERR: ${e}`);
      }
    }

    let embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(mutationData.name)
      .setURL('https://discord.com/channels/1201662672383254658/1201819842475466773/1269418297330503710')
      .setAuthor({ name: 'Weekly Mutation', iconURL: 'https://cdn.discordapp.com/emojis/1262599542914682902.webp?size=80&quality=lossless'})
      .setThumbnail('https://cdn.discordapp.com/emojis/1262599542914682902.webp?size=80&quality=lossless')
      .addFields(
        { name: 'Top Commander', value: mutationData.choice },
        { name: '\u200B', value: '\u200B' },
        ...mutatorField
      )
      .setTimestamp()
      .setFooter({ text: `(${mutationData.rating}🗡${mutationData.difficulty})` });
    await interaction.reply({
      embeds: [embed],
    });
  },
};

