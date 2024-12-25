// TODO: Enable hypertoggling for >15 webhooks
// TODO: On timed deletions, handle exception where msg is prematurely deleted
// TODO: Disable self-guild calls
// TODO: Remove outbound initial reply
// TODO: Rate limit and only allow one session

import {  ChatInputCommandInteraction, Collection, Guild, Message, MessageCollector, PermissionsBitField, TextChannel } from 'discord.js';

import { event as guildFetch } from '../events/guildFetch.ts';
import { WebhookManager } from './index.ts';

import { Sojourn } from './types.ts';

export class Nexus {
  private interaction: ChatInputCommandInteraction;
  private sourceChannel: TextChannel;
  private guildInput: string;
  private reason: string | null | undefined;
  // Type inferred
  private guildData = guildFetch.guildData;
  private botId: string;
  private targetGuild: Guild | null = null;
  private targetChannel: TextChannel | null = null;
  private sojourns: Sojourn[] = [];
  public outboundCollector: MessageCollector | null = null;
  public inboundCollector: MessageCollector | null = null;
  public webhookController: WebhookManager = new WebhookManager();

  constructor(interaction: ChatInputCommandInteraction, guildInput: string, reason: string | null) {
    this.interaction = interaction;
    this.sourceChannel = interaction.channel as TextChannel;
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

  private createOutboundCollector(): MessageCollector {
    if (!this.interaction) {
      throw new Error('Interaction undetected.');
    }

    if (!this.sourceChannel) {
      throw new Error('Channel of interaction undetected.');
    }

    return this.outboundCollector = new MessageCollector(this.sourceChannel);
  }

  private createInboundCollector(): MessageCollector {
    if (!this.targetChannel) {
      throw new Error('Channel target can not be found.');
    }

    return this.inboundCollector = new MessageCollector(this.targetChannel);
  }

  public terminate(): void {
    console.log(this.capacity());
    if (this.capacity() === 0) {
      // Already have custom dispatch msg on denial
      this.outboundCollector?.stop();
      this.inboundCollector?.stop();
      let denialMsg = (this.sourceChannel as TextChannel).send({ content: `### Request Denied.` }).then((msgRef) => {
        let deletionMsgRef = msgRef.reply({ content: `-# Deleting <t:${Math.ceil(new Date().getTime() / 1000) + 10}:R>` });
        setTimeout(() => {
          msgRef.delete();
          deletionMsgRef.then(ref => ref.delete());
        }, 10000);
      });
      return;
    }
    let channelNames: string[] = [];
    let disparateChannels: number = 0;
    for (let { guild } of this.sojourns) {
      if (!channelNames.includes(guild.name)) {
        channelNames.push(guild.name);
        disparateChannels++;
      }
    }
    console.log(channelNames);
    console.log(disparateChannels);
    if (disparateChannels > 1) {
      (this.sourceChannel as TextChannel).send('Connection terminated.');
      this.targetChannel!.send('Connection terminated.');
      this.outboundCollector?.stop();
      this.inboundCollector?.stop();
      return;
    }
    // Else have specialized msgs override
    return;
  }

  public getSojourns(): Sojourn[] {
    return this.sojourns;
  }

  public setSojourns(...args: Sojourn[]): Sojourn[] | void {
    if (args.length === 1) {
      if (this.hasSojourn(args[0])) {
        console.error('User is already participating.');
        return;
      }
      this.sojourns.push(args[0]);
      return;
    }
    return this.sojourns = [...args];
  }

  public removeSojourn(sojournInput: Sojourn): void {
    let prevCount = this.capacity();
    this.sojourns = this.sojourns.filter(sojourn => {
      if (sojourn.name.toUpperCase() === sojournInput.name.toUpperCase()) {
        if (sojourn.guild === sojournInput.guild) {
          return true;
        }
        return false;
      }
      return false;
    });
    let newCount = this.capacity();
    if (prevCount === newCount) {
      throw new Error('User does not exist in the nexus.');
    }
  }

  public hasSojourn(sojournInput: Sojourn): boolean {
    let sojournIndex = this.sojourns.findIndex(sojourn => sojourn.name.toUpperCase() === sojournInput.name.toUpperCase());
    if (sojournIndex === -1) {
      return false;
    } else {
      return true;
    }
  }

  public capacity(): number {
    return this.sojourns.length;
  }

  public getSourceChannel(): TextChannel {
    return this.sourceChannel;
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

  public setSourceChannel(newSourceChannel: TextChannel): TextChannel {
    return this.sourceChannel = newSourceChannel;
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

    let currentChannel = this.sourceChannel as TextChannel;
    this.outboundCollector.stop();
    this.outboundCollector = null;

    if (newChannel.guild !== currentChannel.guild) {
      this.outboundCollector = new MessageCollector(currentChannel);
      await WebhookManager.transfer(this.webhookController, this.targetChannel, newChannel);
      this.targetChannel = newChannel;
    } else {
      this.outboundCollector = new MessageCollector(newChannel);
      await WebhookManager.transfer(this.webhookController, currentChannel, newChannel);
    }
    this.outboundCollector.on('collect', this.outCollectorFn);
    return;
  }

  public async redirectInboundCollector({ 
    newChannel,
    prevSourceChannel = null,
  }: {
    newChannel: TextChannel
    prevSourceChannel?: TextChannel | null,
  }): Promise<void> {
    if (!prevSourceChannel && !newChannel) {
      throw new Error('No overload matched.');
    }

    if (this.inboundCollector === null) {
      throw new Error('No collector to redirect');
    }

    this.inboundCollector.stop();
    this.inboundCollector = null;

    if (this.targetChannel === null) {
      throw new Error('Unable to find target channel; redirect failed.');
    }

    if (newChannel.guild !== this.targetGuild) {
      if (prevSourceChannel === null) {
        throw new Error('Previous source channel is required.');
      }
      await WebhookManager.transfer(this.webhookController, prevSourceChannel, newChannel);
      this.sourceChannel = newChannel;
      this.inboundCollector = new MessageCollector(this.targetChannel);
      this.inboundCollector.on('collect', this.inCollectorFn);
    } else {
      this.inboundCollector = new MessageCollector(newChannel);
      this.inboundCollector.on('collect', this.inCollectorFn);
    }
    return;
  }

  // Type?
  public outCollectorFn: (args_0: Message<boolean>, args_1: Collection<string, Message<boolean>>) => void = async (msg: Message) => {
    // Is not a bot
    if (msg.author.bot) return;

    // Is a participant
    let sojourn: Sojourn = {
      name: msg.author.username,
      guild: msg.guild!,
    }

    if (sojourn.guild === null) {
      throw new Error('Cannot parse user\'s guild.');
    }

    if (!this.hasSojourn(sojourn)) {
      return;
    }

    if (this.outboundCollector === null) {
      throw new Error('Outbound collector is somehow null.');
    }
    if (this.outboundCollector.collected.size === 1) {
      WebhookManager.cleanse(this.webhookController, this).catch(err => console.error(err));
      this.webhookController.eradicate();
    }

    if (await this.webhookController.has(msg.author.username, this.targetChannel as TextChannel) === false) {
      await this.webhookController.add(msg, this.targetChannel as TextChannel);
    }
    let webhook = this.webhookController.get(msg.author.username, this.targetChannel as TextChannel);

    if (msg.content === '$cancel') {
      this.terminate();
      WebhookManager.cleanse(this.webhookController, this).catch(err => console.error(err));
      this.webhookController.eradicate();
      return;
    }
    // console.log(`From ${msg.channel} to ${targetChannel}, outbound`);
    await WebhookManager.fire(webhook, msg);

  };

  public inCollectorFn: (args_0: Message<boolean>, args_1: Collection<string, Message<boolean>>) => void = async (msg: Message) => {
    // Is not a bot
    if (msg.author.bot) return;

    // Is a participant
    let sojourn: Sojourn = {
      name: msg.author.username,
      guild: msg.guild!,
    }

    if (sojourn.guild === null) {
      throw new Error('Cannot parse user\'s guild.');
    }

    if (!this.hasSojourn(sojourn)) {
      return;
    }

    if (this.inboundCollector === null) {
      throw new Error('Inbound collector is somehow null.');
    }
    if (this.inboundCollector.collected.size === 1) {
      WebhookManager.cleanse(this.webhookController, this).catch(err => console.error(err));
      this.webhookController.eradicate();
    }
    if (await this.webhookController.has(msg.author.username, this.sourceChannel as TextChannel) === false) {
      await this.webhookController.add(msg, this.sourceChannel as TextChannel);
    }

    if (msg.content === '$cancel') {
      this.terminate();
      WebhookManager.cleanse(this.webhookController, this).catch(err => console.error(err));
      this.webhookController.eradicate();
      return;
    }
    // console.log(this.webhookController);
    // console.log(`From ${msg.channel} to ${interaction.channel}, inbound`);
    await WebhookManager.fire(this.webhookController.get(msg.author.username, this.sourceChannel as TextChannel), msg);
  };
}
