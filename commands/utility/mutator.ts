import { TextChannel, SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';

import prisma from '../../prisma/db.ts';

type Timer = NodeJS.Timer | number | null;

export const command = {
  data: new SlashCommandBuilder()
  .setName('mutator')
  .setDescription('identifies sc2 mutators'),
  weekIntvId: null as Timer,
  async execute(interaction: ChatInputCommandInteraction) {
    let data: Response | string[] = await fetch('https://docs.google.com/spreadsheets/d/1NvYbNvHkivOKJ9vWf9EneXxvwMlCC4nkjqHlv6OCRQo/export?format=csv&gid=0');
    let mutatorList: Response | string[][] = await fetch('https://docs.google.com/spreadsheets/d/1NvYbNvHkivOKJ9vWf9EneXxvwMlCC4nkjqHlv6OCRQo/export?format=csv&gid=552822006')

    interface MutationData {
      id: string | number;
      data: Response | string;
      name: string;
      map: string;
      mutators: string[];
      choice: string;
      difficulty: string;
      rating: string,
    }

    let mutationData: MutationData | undefined = undefined;
    let mutatorField: Array<object | undefined> = [];

    function getYDM(dateObj: Date): string {
      // console.log('Capturing date string');
      return dateObj.toISOString().substring(0, 10);
    }

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
      let currDate = getYDM(new Date());
      let currDateVal = getYDMValue(currDate);
      let low = 0
      let high = data.length - 6;

      while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        let midData = data[mid];
        let rawMidDataDate: number | undefined = getRawData(midData, 'date');
        let [prevMidData, nextMidData] = [data[mid - 1], data[mid + 1]];
        let [rawPrevDataDate, rawNextDataDate]: [number | undefined, number | undefined] = [getRawData(prevMidData, 'date'), getRawData(nextMidData, 'date')];
        console.log(`Prev: ${rawPrevDataDate}\nTarget: ${rawMidDataDate}\nCurrent: ${currDateVal}\nNext: ${rawNextDataDate}`);
        console.log(currDateVal);
        if (!midData || !rawMidDataDate || !prevMidData || !nextMidData || !rawPrevDataDate || !rawNextDataDate) return false;
        if (currDateVal >= rawMidDataDate && currDateVal < rawNextDataDate) {
          return data[mid].split(",");
        } else if (currDateVal < rawMidDataDate) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      return false;
    }

    async function generateMutationData(): Promise<MutationData | undefined> {
      try {
        data = await (data as Response).text().then(res => res.split('\n')) as string[];
        mutatorList = await (mutatorList as Response).text().then(res => res.split('\n')).then(res => {
          let itemized = [];
          for (let i = 0; i < res.length; i++) {
            if (res[i] !== undefined) itemized.push(res[i].split(','));
          }
          return itemized;
        }) as string[][];
        //
        // Remove labels
        data.shift() && mutatorList.shift() && mutatorList.pop();

        let mutation = searchMutator(data) as string[];

        let mutators: Array<string> = [mutation[7], mutation[8], mutation[9]].filter(title => title.length >= 1);
        return mutationData = {
          id: mutation[0],
          data: mutation[1],
          name: mutation[2],
          map: mutation[3],
          mutators: mutators,
          choice: mutation[11].replaceAll(/(?:[\[\]])/g, ''),
          difficulty: mutation[13],
          rating: mutation[14],
        }
      } catch (err) {
        console.log(`${err}\nUnable to generate mutation data.`);
      }
    }

    async function generateMutatorEmbed(): Promise<EmbedBuilder | undefined> {
      if (data !== undefined) {
        try {
          mutationData = await generateMutationData();
          if (!data || mutationData === undefined) throw new Error('Unable to generate mutation data.')
            for (let i = 0; i < mutationData.mutators.length; i++) {
              // console.log(mutatorList.split(',').find(item => item[0] === mutationData.mutators[i + 1])[2])
              let target = mutationData.mutators[i];
              if (!mutatorList || !target) return;
              let desc: string = (mutatorList as unknown as string[][]).find(mutator => target === mutator[0])![2];
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
      return new EmbedBuilder()
      .setColor(color)
      .setTitle(mutationData.name)
      .setURL('https://discord.com/channels/1201662672383254658/1201819842475466773/1269418297330503710')
      .setAuthor({ name: 'Weekly Mutation', /*iconURL: 'https://i.postimg.cc/hv0M7QFr/365422.jpg'*/})
      //.setThumbnail('https://cdn.discordapp.com/emojis/1262599542914682902.webp?size=80&quality=lossless')
      .addFields(
        { name: 'Map', value: mutationData.map },
        { name: 'Top Pick', value: mutationData.choice },
        // { name: '\u200B', value: '\u200B' },
        ...mutatorField as { name: string; value: string; inline?: boolean }[] // cannot statically type as generic objects
      )
      .setTimestamp()
      .setFooter({ text: `(${mutationData.rating}🗡${mutationData.difficulty})` });
    }

    // TODO: Perform a manual ms offset for minute insurance or enhance precision logic
    async function adjustTimer(): Promise<number> {
      /** @privateRemarks `toLocaleString` or `Intl.DateTimeFormat()` constructor dismisses 
       * milliseconds, use only for formatting, not logic precision, you can however pass it
       * as a dateString when constructing a date, which then may be of use. 
       *
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#datestring}
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#options}
       * @see {@link https://unicode.org/reports/tr35/#Time_Zone_Identifiers} */
      let now: Date = new Date();
      let relTime = dailyMs * now.getDay() + 
        (now.getUTCHours() * 60 * 60 * 1000 - 8 * 60 * 60 * 1000) +
        (now.getUTCMinutes() * 60 * 1000) +
        (now.getUTCSeconds() * 1000) + now.getMilliseconds();
      return reset = targetMs - (relTime % targetMs);
    }

    let caller: string = interaction.commandName;
    let dailyMs: number = 24 * 60 * 60 * 1000;
    let targetMs: number = dailyMs * 7;
    let reset: number | null = null;

    async function intvFn(channel: TextChannel): Promise<void> {
      let embed = await generateMutatorEmbed();
      if (!embed) throw new Error('Unable to generate embed.');
      await channel.send({
        embeds: [embed],
      });
      adjustTimer();
      clearTimeout(command.weekIntvId as ReturnType<typeof setTimeout> | NodeJS.Timeout);
      if (typeof reset !== 'number') throw new Error('Timer failed to adjust.');
      command.weekIntvId = setTimeout(() => intvFn(channel), reset);
    }

    // TODO: For scalability, use switch statement
    // TODO: Research mutator `searchMutator()` each interval; may have to reconstruct embed
    caller === 'mutator' ? 
      +(async () => {
      let embed = await generateMutatorEmbed();
      if (!embed) throw new Error('Unable to generate embed.');
      await interaction.reply({
        embeds: [embed],
      });
    })() :
      +(async () => {
      try {
        let embed = await generateMutatorEmbed();
        if (!embed) throw new Error('Unable to generate embed.');
        if (!interaction.guildId) throw new Error('Guild ID unobtainable.');

        let config = await prisma.config.findUnique({
          where: { serverId: interaction.guildId },
        });

        // @ts-ignore
        let channel: TextChannel = interaction.guild.channels.cache.get(config.dmcChannelId);
        await channel.send({ embeds: [embed] });
        adjustTimer();
        if (typeof reset !== 'number') throw new Error('Initial timer failed to adjust.')
          command.weekIntvId = setTimeout(() => intvFn(channel), reset);
      } catch (err) {
        console.error(`ERR: Failed to parse config: ${err}`);
      }
    })();
  },
};
