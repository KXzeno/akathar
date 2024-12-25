import { Client, Collection, Events, Guild } from 'discord.js';

import { GuildData } from '../utils/types.ts';

// Runs once when client is ready
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.

export const event = {
  name: Events.ClientReady,
  guildData: null as unknown as GuildData[],
  execute(readyClient: Client<true>) {
    let mem: GuildData[] = [];
    let guilds: Collection<string, Guild> = readyClient.guilds.cache;
    guilds.forEach(guild => {
      mem.push({
        data: guild,
        name: guild.name,
        id: guild.id,
      } as GuildData);
    });
    event.guildData = mem;
  }
};


