import { Events } from 'discord.js';
import { scheduler } from 'node:timers/promises';

export const event = {
  name: Events.GuildCreate,
  async execute(guild) {
    let defaultChannel = guild.systemChannel;
    if (defaultChannel) {
      defaultChannel.send('https://tenor.com/view/halo-master-chief-halo-infinite-xbox-xbox-series-x-gif-19586612');
      await scheduler.wait(7000);
      defaultChannel.send(`I've landed.`)
        .then(message => console.log(`Sent welcome message: ${message.content}`))
        .catch(console.error);
    }
      await scheduler.wait(3000);
      defaultChannel.send(`As of now, I handle zero concerns and services.`);
      await scheduler.wait(5000);
    defaultChannel.send(`But Kx left a little gift for a certain holiday: \`/gex\`. Happy grinding.`);
  }
}
