import { Guild } from "discord.js";

export type GuildData = {
  data: Guild;
  name: string;
  id: string;
  defaultChannel: string | undefined;
}

export type Sojourn = {
  name: string;
  guild: Guild;
}

