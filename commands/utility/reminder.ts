import { ChatInputCommandInteraction, GuildBasedChannel, SlashCommandBuilder, TextChannel } from 'discord.js';

import { command as timetable } from './settimetable.ts'
import { Timer } from '../../utils/index.ts';

// TODO: Create a scheduler relative to UTC and current + next year 

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

    let timer: string | null = interaction.options.getString('timer');
    let content: string | null = interaction.options.getString('description');

    if (hasTimeTable && interaction.guild && content) {
      targetChannel = interaction.guild.channels.cache.get(timetableChannelId) as GuildBasedChannel as TextChannel;
      targetChannel.send(`### ${interaction.user.displayName}'s reminder: \`${content}\`\n${Timer.createTimer(Timer.parseInputToISO(timer))}\n-# WARNING: THIS FEATURE IS UNSTABLE, CURRENTLY ONLY SUPPORTS THE REGEX PATTERN: [DIGITS]m`);
      interaction.reply(`Reminder sent to <#${timetableChannelId}>`);
    } else {
      interaction.reply(`### ${interaction.user.displayName}'s reminder: \`${content}\`\n${Timer.createTimer(Timer.parseInputToISO(timer))}\n-# WARNING: THIS FEATURE IS UNSTABLE, CURRENTLY ONLY SUPPORTS THE REGEX PATTERN: [DIGITS]m`);
    }
  }
}

