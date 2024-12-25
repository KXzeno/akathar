// TODO: Enable hypertoggling for >15 webhooks

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
  public webhookController: WebhookManager = new WebhookManager();

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

  public terminate() {
    (this.interaction.channel as TextChannel).send('Connection terminated.');
    this.targetChannel!.send('Connection terminated.');
    this.outboundCollector?.stop();
    this.inboundCollector?.stop();
  }

  public getReason(): string | null {
    return this.reason || null;
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

  public async redirectOutboundCollector(newChannel: TextChannel): Promise<void> {
    if (this.outboundCollector === null) {
      throw new Error('No collector to redirect');
    }

    if (!this.targetChannel) {
      throw new Error('No target channel initialized');
    }

    let currentChannel = this.outboundCollector.channel as TextChannel;
    this.outboundCollector.stop();
    this.outboundCollector = null;
    this.outboundCollector = new MessageCollector(currentChannel);
    await WebhookManager.transfer(this.webhookController, this.targetChannel, newChannel);
    this.targetChannel = newChannel;
    this.outboundCollector.on('collect', this.outCollectorFn);
  }

  public async redirectInboundCollector(newChannel: TextChannel): Promise<void> {
    if (this.inboundCollector === null) {
      throw new Error('No collector to redirect');
    }

    this.inboundCollector.stop();
    this.inboundCollector = null;
    this.inboundCollector = new MessageCollector(newChannel);
    this.inboundCollector.on('collect', this.inCollectorFn);
  }

  // Type?
  public outCollectorFn: (args_0: Message<boolean>, args_1: Collection<string, Message<boolean>>) => void = async (msg: Message) => {
    if (msg.author.bot) return;
    if (await this.webhookController.has(msg.author.username, this.targetChannel as TextChannel) === false) {
      await this.webhookController.add(msg, this.targetChannel as TextChannel);
    }
    let webhook = this.webhookController.get(msg.author.username, this.targetChannel as TextChannel);
    // console.log(`From ${msg.channel} to ${targetChannel}, outbound`);
    await WebhookManager.fire(webhook, msg);

    if (msg.content === '$cancel') {
      this.terminate();
      WebhookManager.cleanse(this.webhookController, this).catch(err => console.error(err));
      this.webhookController.eradicate();
    }
  };

  public inCollectorFn: (args_0: Message<boolean>, args_1: Collection<string, Message<boolean>>) => void = async (msg: Message) => {
    if (msg.author.bot) return;
    if (await this.webhookController.has(msg.author.username, this.interaction.channel as TextChannel) === false) {
      await this.webhookController.add(msg, this.interaction.channel as TextChannel);
    }
    // console.log(`From ${msg.channel} to ${interaction.channel}, inbound`);
    await WebhookManager.fire(this.webhookController.get(msg.author.username, this.interaction.channel as TextChannel), msg);
    if (msg.content === '$cancel') {
      this.terminate();
      WebhookManager.cleanse(this.webhookController, this).catch(err => console.error(err));
      this.webhookController.eradicate();
    }
  };



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
