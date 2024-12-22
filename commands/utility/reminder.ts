import { ChatInputCommandInteraction, GuildBasedChannel, MessageReaction, ReactionCollector, SlashCommandBuilder, TextChannel, User } from 'discord.js';

import { command as timetable } from './settimetable.ts'
import { Timer } from '../../utils/index.ts';

// TODO: Create a scheduler relative to UTC and current + next year 
// TODO: Create status check with reaction-based termination
// TODO: Allow early termination

    // Timer for more general term?
export const command = {
  data: new SlashCommandBuilder()
  .setName('reminder')
  .setDescription('set a reminder with a description at a specified time')
  .addStringOption(timer => timer.setName('timer').setDescription('compliant inputs are interpreted and compiled to ISO 8601: P[n]DT[n]H[n]M[n]S[n]').setRequired(true))
  .addStringOption(desc => desc.setName('description').setDescription('the reminder')),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel) return;

    let targetChannel: TextChannel | null = null;

    let { hasTimeTable } = timetable;
    let { timetableChannelId } = timetable;

    let timer: string | null = interaction.options.getString('timer');
    let content: string | null = interaction.options.getString('description');

    // 'content' fallback
    if (content === null) {
      content = 'None.'
    }

    if (hasTimeTable && interaction.guild && content) {
      targetChannel = interaction.guild.channels.cache.get(timetableChannelId) as GuildBasedChannel as TextChannel;
      if (targetChannel === null) {
        return interaction.reply("Something went wrong with finding the timetable...");
      }

      let msgRef = await targetChannel.send(`### ${interaction.user.displayName}'s reminder: \`${content}\`\n${Timer.createTimer(Timer.parseInputToISO(timer))}\n-# WARNING: THIS FEATURE IS UNSTABLE, CURRENTLY ONLY SUPPORTS THE REGEX PATTERN: [DIGITS]m (e.g., 20m)`);
      msgRef.react('✅');

      interaction.reply(`Reminder sent to <#${timetableChannelId}>`);
      // TODO: ERR msg / handling
      if (msgRef === null) return;
      setTimeout(() => {
        // targetChannel already checked
        targetChannel!.send({ content: `<@${interaction.user.id}>`, reply: { messageReference: msgRef.id }});
      }, Timer.parseInputToISO(timer));
    } else {
      let msgRef = await interaction.reply({ content: `### ${interaction.user.displayName}'s reminder: \`${content}\`\n${Timer.createTimer(Timer.parseInputToISO(timer))}\n-# WARNING: THIS FEATURE IS UNSTABLE, CURRENTLY ONLY SUPPORTS THE REGEX PATTERN: [DIGITS]m`, fetchReply: true});
      msgRef.react('\u{1F50C}');

      let msg = await interaction.fetchReply();
      // TODO: ERR msg / handling
      if (msg === null) return;
      let timeoutID = setTimeout(() => {
        msg.reply({ content: `<@${interaction.user.id}>`});
      }, Timer.parseInputToISO(timer));

      let collector: ReactionCollector = new ReactionCollector(msgRef, { filter: (reaction: MessageReaction, user: User) => {
        return reaction.emoji.name === '\u{1F50C}' && !user.bot;
      }, time: Timer.parseInputToISO(timer)});

      collector.on('collect', (reaction, user) => {
        if (user.id !== interaction.user.id) {
          reaction.users.remove(user.id);
        } else {
          let unix: RegExpMatchArray | number | null = msgRef.content.match(/(?<=\<t\:)[\d]+(?=\:R\>)/);
          // TODO: Handle nullish
          if (!unix) return;
          // Lossy widen conversion
          unix = Number.parseInt(unix[0]) * 10 ** 3;
          let now: number = new Date().getTime();
          let newContent: string = msgRef.content.replaceAll(/(?<=\n)[\S\s]+(-\#)[\S\s]+/g, `$1 Terminated; ${Math.floor((unix - now) * 10 ** -3 / 60 * 1000) / 1000}m remaining`);
          msgRef.edit({ content: newContent });
          reaction.remove();
          clearTimeout(timeoutID);
        }
      });

      collector.on('end', collected => {
        let confirmationCollector: ReactionCollector = new ReactionCollector(msgRef);

        // Will you follow through? X / Y
      });
    }
  }
}

