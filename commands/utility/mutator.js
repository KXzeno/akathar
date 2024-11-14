import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const command = {
  data: new SlashCommandBuilder()
  .setName('mutator')
  .setDescription('identifies sc2 mutators'),
  async execute(interaction) {
    let data = await fetch('https://docs.google.com/spreadsheets/d/1NvYbNvHkivOKJ9vWf9EneXxvwMlCC4nkjqHlv6OCRQo/export?format=csv&gid=0');
    let mutatorList = await fetch('https://docs.google.com/spreadsheets/d/1NvYbNvHkivOKJ9vWf9EneXxvwMlCC4nkjqHlv6OCRQo/export?format=csv&gid=552822006')

    let mutationData = undefined;
    let mutatorField = [];

    function getYDM(dateObj) {
      // console.log('Capturing date string');
      return dateObj.toISOString().substring(0, 10);
    }

    let currDate = getYDM(new Date());

    function getYDMValue(dateObj) {
      if (typeof dateObj === 'object') {
        // console.log('Converting date value');
        return Number.parseInt(getYDM(dateObj).split('-').join(''));
      }
      // console.log('Converting date value');
      return Number.parseInt(dateObj.split('-').join(''));
    }

    function getRawData(parsedSSLine, prop) {
      switch (prop) {
        case 'id': {
          // console.log('Getting prop: id');
          if (typeof parsedSSLine !== 'string') break;
          return parsedSSLine.split(',')[0];
        }
        case 'date': {
          // console.log('Getting prop: date');
          if (typeof parsedSSLine !== 'string') break;
          return getYDMValue(parsedSSLine.split(',')[1]);
        }
        default: {
          // console.log('Getting prop: failed');
          break;
        }
      }
    }

    function searchMutator(data) {
      let low = 0
      let high = data.length - 6;

      while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        // console.log(getYDMValue(currDate), '\n', getRawData(data[mid], 'date'));
        // console.log(mid);
        if (getYDMValue(currDate) === getRawData(data[mid], 'date') || (getYDMValue(currDate) > getRawData(data[mid - 1], 'date') && !(getYDMValue(currDate) > getRawData(data[mid], 'date')))) {
          return currDate === data[mid][1] ? data[mid].split(',') : data[mid - 1].split(',');
        } else if (getYDMValue(currDate) < getRawData(data[mid], 'date')) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      return false;
    }

    if (data !== undefined) {
      try {
        data = await data.text().then(res => res.split('\n'));
        mutatorList = await mutatorList.text().then(res => res.split('\n')).then(res => {
          let itemized = [];
          for (let i = 0; i < res.length; i++) {
            if (res[i] !== undefined) itemized.push(res[i].split(','));
          }
          return itemized;
        });

        // Remove labels
        data.shift() && mutatorList.shift() && mutatorList.pop();

        let mutation = searchMutator(data);
        // console.log(`Mutation: ${mutation}`);
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
          // console.log(mutatorList.split(',').find(item => item[0] === mutationData.mutators[i + 1])[2])
          let desc = mutatorList.find(mutator => mutationData.mutators[i] === mutator[0])[2];
          // console.log(desc);
          mutatorField.push({ name: `Mutator ${i + 1}`, value: `${mutationData.mutators[i]}\n\n${desc}`, inline: true });
        }
        // console.log('Mutator Field: ', ...mutatorField);
        // console.log(mutationData);
      } catch (e) {
        // console.log(`ERR: ${e}`);
      }
    }

    let color;

    switch (mutationData.rating.at(mutationData.rating.length - 1)) {
      case '1': color = 0xC9DAF8; break;
      case '2': color = 0x86B7CA; break;
      case '3': color = 0xFFE599; break;
      case '4': color = 0x969FA4; break;
      case '5': color = 0x9491B4; break;
      case '6': color = 0xFF0000; break;
      default: color = 0xFFFFFF; break;
    }

    let embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(mutationData.name)
      .setURL('https://discord.com/channels/1201662672383254658/1201819842475466773/1269418297330503710')
      .setAuthor({ name: 'Weekly Mutation', /*iconURL: 'https://i.postimg.cc/hv0M7QFr/365422.jpg'*/})
    //.setThumbnail('https://cdn.discordapp.com/emojis/1262599542914682902.webp?size=80&quality=lossless')
      .addFields(
        { name: 'Map', value: mutationData.map },
        { name: 'Top Commander', value: mutationData.choice },
        // { name: '\u200B', value: '\u200B' },
        ...mutatorField
      )
      .setTimestamp()
      .setFooter({ text: `(${mutationData.rating}🗡${mutationData.difficulty})` });
    await interaction.reply({
      embeds: [embed],
    });
  },
};

