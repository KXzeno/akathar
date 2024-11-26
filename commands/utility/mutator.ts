import { TextChannel, SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';

import prisma from '../../prisma/db.ts';

export const command = {
  data: new SlashCommandBuilder()
  .setName('mutator')
  .setDescription('identifies sc2 mutators~'),
  weekIntvId: setInterval(() => null, 0) as NodeJS.Timer,
  async execute(interaction: ChatInputCommandInteraction) {
    let data: Response | string[] = await fetch('https://docs.google.com/spreadsheets/d/1NvYbNvHkivOKJ9vWf9EneXxvwMlCC4nkjqHlv6OCRQo/export?format=csv&gid=0');
    let mutatorList: Response | string[][] = await fetch('https://docs.google.com/spreadsheets/d/1NvYbNvHkivOKJ9vWf9EneXxvwMlCC4nkjqHlv6OCRQo/export?format=csv&gid=552822006')

    interface MutationData {
      id: string | number;
      data: string;
      name: string;
      map: string;
      mutators: string[];
      choice: string;
      difficulty: string;
      rating: string,
    }

    let mutationData: MutationData | undefined = undefined;
    let mutatorField = [];

    function getYDM(dateObj: Date): string {
      // console.log('Capturing date string');
      return dateObj.toISOString().substring(0, 10);
    }

    let currDate = getYDM(new Date());

    function getYDMValue(dateObj: Date | string): number {
      if (typeof dateObj === 'object') {
        // console.log('Converting date value');
        return Number.parseInt(getYDM(dateObj).split('-').join(''));
      }
      // console.log('Converting date value');
      return Number.parseInt(dateObj.split('-').join(''));
    }

    function getRawData(parsedSSLine: string, prop: string) {
      switch (prop) {
        case 'id': {
          // console.log('Getting prop: id');
          if (typeof parsedSSLine !== 'string') break;
          return Number.parseInt(parsedSSLine.split(',')[0]);
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

    function searchMutator(data: string | string[]): string[] | boolean {
      let low = 0
      let high = data.length - 6;

      while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        // console.log(getYDMValue(currDate), '\n', getRawData(data[mid], 'date'));
        // console.log(mid);
        let midData = data[mid];
        let aftMidData = data[mid - 1];
        let rawMidDataDate = getRawData(midData, 'date');
        let rawAftMidDataDate = getRawData(aftMidData, 'date');
        if (!midData || !aftMidData || !rawMidDataDate || !rawAftMidDataDate) return false;
        if (getYDMValue(currDate) === rawMidDataDate || (getYDMValue(currDate) > rawAftMidDataDate && !(getYDMValue(currDate) > rawMidDataDate))) {
          return currDate === data[mid][1] ? data[mid].split(',') : data[mid].split(',');
        } else if (getYDMValue(currDate) < rawMidDataDate) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      return false;
    }

    if (data !== undefined) {
      try {
        data = await data.text().then(res => res.split('\n')) as string[];
        mutatorList = await mutatorList.text().then(res => res.split('\n')).then(res => {
          let itemized = [];
          for (let i = 0; i < res.length; i++) {
            if (res[i] !== undefined) itemized.push(res[i].split(','));
          }
          return itemized;
        }) as string[][];

        // Remove labels
        data.shift() && mutatorList.shift() && mutatorList.pop();

        let mutation = searchMutator(data) as string[];
        // console.log(`Mutation: ${mutation}`);
        let mutators: Array<string> = [mutation[7], mutation[8], mutation[9]].filter(title => title.length >= 1);
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
          let target = mutationData.mutators[i];
          if (!mutatorList || !target) return;
          let desc: string = mutatorList.find(mutator => target === mutator[0])![2];
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
    if (!mutationData) throw new Error ('No Mutation Data Detected.');

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
      { name: 'Top Pick', value: mutationData.choice },
      // { name: '\u200B', value: '\u200B' },
      ...mutatorField
    )
    .setTimestamp()
    .setFooter({ text: `(${mutationData.rating}🗡${mutationData.difficulty})` });

    let caller: string = interaction.commandName;
    let time: Date = new Date();
    let dailyMs: number = 24 * 60 * 60 * 1000;
    let targetMs: number = dailyMs * 7;
    let reset: number | null = null;
    let currWeekRelTime: number = dailyMs * time.getDay() + 
      (time.getUTCHours() *  60 * 60 * 1000 - 8 * 60 * 60 * 1000) + 
      (time.getUTCMinutes() * 60 * 1000) + 
      (time.getUTCSeconds() * 1000) + time.getMilliseconds();

    async function intvFn(channel: TextChannel): Promise<void> {
      await channel.send({
        embeds: [embed],
      });
      let now: Date = new Date();
      let newCWRL: number = dailyMs * now.getDay() + 
        (time.getUTCHours() * 60 * 60 * 1000 - 8 * 60 * 60 * 1000) +
        (time.getUTCMinutes() * 60 * 1000) +
        (time.getUTCSeconds() * 1000) + time.getMilliseconds();
      reset = targetMs - (newCWRL % targetMs);
      if (typeof command.weekIntvId === 'number') {
        clearInterval(command.weekIntvId);
        command.weekIntvId = setInterval(async () => {
          await channel.send({
            embeds: [embed],
          });
        }, reset)
      }
    }

    caller === 'mutator' ? 
      +(async () => {
      await interaction.reply({
        embeds: [embed],
      });
    })() :
      +(async () => {
      try {
        if (!interaction.guildId) throw new Error('Guild ID unobtainable.');

        let config = await prisma.config.findUnique({
          where: { serverId: interaction.guildId },
        });

        // @ts-ignore
        let channel: TextChannel = interaction.guild.channels.cache.get(config.dmcChannelId);
        setTimeout(async() => await channel.send({ embeds: [embed] },), targetMs - (currWeekRelTime % targetMs) + (2 * 60 * 60 * 1000));
        command.weekIntvId = setInterval(() => intvFn(channel), targetMs);
      } catch (err) {
        console.error(`ERR: Failed to parse config: ${err}`);
      }
    })();
  },
};
