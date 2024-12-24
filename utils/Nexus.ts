import {  ChatInputCommandInteraction, Collection, Guild, Message, MessageCollector, PermissionsBitField, SlashCommandBuilder, TextChannel, Webhook } from 'discord.js';

import { event as guildFetch } from '../events/guildFetch.ts';
import { WebhookManager } from './index.ts';


export class Nexus {
  private interaction: ChatInputCommandInteraction;
  private guildInput: string;
  private reason: string | null | undefined;
  // Type inferred
  private guildData = guildFetch.guildData;
  private botId: string;
  private targetGuild: Guild | null = null;
  private targetChannel: TextChannel | null = null;
  public outboundCollector: MessageCollector | null = null;
  public inboundCollector: MessageCollector | null = null;

  constructor(interaction: ChatInputCommandInteraction, guildInput: string, reason: string | null) {
    this.interaction = interaction;
    this.guildInput = guildInput;
    this.botId = interaction.applicationId;
    this.setGuildTarget();
    this.setChannelTarget();
    this.createOutboundCollector();
    this.createInboundCollector();
    if (reason) {
      this.reason = reason;
    } else {
      this.reason = null;
    }
  }

  public static terminate(nexus: Nexus) {
    (nexus.interaction.channel as TextChannel).send('Connection terminated.');
    nexus.targetChannel!.send('Connection terminated.');
    nexus.outboundCollector?.stop();
    nexus.inboundCollector?.stop();
  }

  public getGuildTarget(): Guild | null {
    return this.targetGuild ?? null;
  }

  public getChannelTarget(): TextChannel | null {
    return this.targetChannel ?? null;
  }

  public setGuildTarget(): Guild {
    let guild = this.guildData.filter(guild => guild.id === this.guildInput || guild.name.toLowerCase() === this.guildInput.toLowerCase())[0]?.data || null;
    if (guild !== null) {
      return this.targetGuild = guild;
    } else {
      throw new Error(`Unable to locate guild: ${this.guildInput}`);
    }
  }

  public setChannelTarget(channel?: TextChannel): TextChannel {
    if (channel) {
      return this.targetChannel = channel;
    }
    if (this.targetGuild && this.targetGuild.systemChannel) {
      return this.targetChannel = this.targetGuild.systemChannel;
    } else {
      throw new Error('Unable to locate system channel');
    }
  }

  public isChannelSendable(channel: TextChannel): boolean {
    if (channel === null) {
      throw new Error('Channel is not initialized.');
    }
    let permissions: Readonly<PermissionsBitField> | null = channel.permissionsFor(this.botId);

    if (permissions === null) return false;

    return permissions.has([PermissionsBitField.Flags.SendMessages]) ? true : false;
  }

  public assertiveSearchDefaultChannel(): void {
    if (this.targetChannel && this.isChannelSendable(this.targetChannel)) {
      throw new Error('Channel fallback not required; target channel already initialized.');
    } else {
      if (!this.targetGuild) throw new Error('DANGEROUS ERROR: GUILD NOT INITIALIZED');
      for (let [_, channel] of this.targetGuild.channels.cache.entries()) {
        if (channel instanceof TextChannel && channel.name) {
          if (this.isChannelSendable(channel)) {
            this.targetChannel = channel;
            break;
          }
        }
      }
    }
  }

  private redirectOutboundCollector(newChannel: TextChannel): void {
    if (this.outboundCollector === null) {
      throw new Error('No collector to redirect');
    }

    this.outboundCollector.stop();
    this.outboundCollector = null;
    this.outboundCollector = new MessageCollector(newChannel);
  }

  private redirectInboundCollector(newChannel: TextChannel): void {
    if (this.inboundCollector === null) {
      throw new Error('No collector to redirect');
    }

    this.inboundCollector.stop();
    this.inboundCollector = null;
    this.inboundCollector = new MessageCollector(newChannel);
  }

  public createOutboundCollector(): MessageCollector {
    if (!this.interaction) {
      throw new Error('Interaction undetected.');
    }

    if (!this.interaction.channel) {
      throw new Error('Channel of interaction undetected.');
    }

    return this.outboundCollector = new MessageCollector(this.interaction.channel);
  }

  public createInboundCollector(): MessageCollector {
    if (!this.targetChannel) {
      throw new Error('Channel target can not be found.');
    }

    return this.inboundCollector = new MessageCollector(this.targetChannel);
  }
}
