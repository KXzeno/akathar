import { ChatInputCommandInteraction, GuildBasedChannel, SlashCommandBuilder, TextChannel } from 'discord.js';

import { command as timetable } from './settimetable.ts'
import { command as test } from './ryzenboy.ts'

// TODO: Create a scheduler relative to UTC and current + next year 

function createTimer(ms: number): string {
  let now: Date = new Date();
  return `<t:${now.setMilliseconds(ms) * 10 ** -3}:R>`;
}

export const command = {
  data: new SlashCommandBuilder()
  .setName('reminder')
  .setDescription('set a reminder with a description at a specified time')
  .addStringOption(timer => timer.setName('timer').setDescription('compliant inputs are interpreted and compiled to ISO 8601: P[n]DT[n]H[n]M[n]S[n]').setRequired(true))
  .addStringOption(desc => desc.setName('description').setDescription('the reminder')),
  async execute(interaction: ChatInputCommandInteraction) {
    let targetChannel: TextChannel | null = null;

    let { hasTimeTable } = timetable;
    let { timetableChannelId } = timetable;

    let content: string | null = interaction.options.getString('description');

    interaction.reply(`OUTPUT: <t:${createTimer(60000)}:R>`);

    if (hasTimeTable && interaction.guild && content) {
      targetChannel = interaction.guild.channels.cache.get(timetableChannelId) as GuildBasedChannel as TextChannel;
      // targetChannel.send(content)
    }
  }
}
