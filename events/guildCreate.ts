import { Guild, Events } from 'discord.js';
import { scheduler } from 'node:timers/promises';

import prisma from '../prisma/db';

export const event = {
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    let defaultChannel = guild.systemChannel;
    if (defaultChannel) {
      try {
      let initServer = await prisma.server.create({
        serverId: guild.id,
        guildName: guild.name,
      });
      } catch (err) {
        console.error(err);
      }
    }
  }
}
