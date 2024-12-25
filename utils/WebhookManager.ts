import { Message, Webhook, TextChannel } from "discord.js"
import { Nexus } from "./Nexus.ts";

export class WebhookManager {
  private webhooks: Webhook[] = [];

  constructor(...arg: Webhook[]) {
    for (let webhook of arg) {
      this.webhooks.push(webhook);
    }
  }

  public static async cleanse(webhooks: WebhookManager, nexus: Nexus): Promise<number> {
    let channelOne = nexus.getChannelTarget();
    if (!channelOne) {
      throw new Error('Cannot parse target channel');
    }
    if (!nexus.outboundCollector) {
      throw new Error('Cannot parse outbound channel');
    }

    let channelTwo = nexus.outboundCollector.channel;
    let channelOneWebhooks = await channelOne.fetchWebhooks();
    let channelTwoWebhooks = await (channelTwo as TextChannel).fetchWebhooks();
    let deleted: number = 0;
    console.log(`One: ${channelOneWebhooks.size}\nTwo: ${channelTwoWebhooks.size}`);
    if (!(channelOneWebhooks.size > 0)) {
      for (let [_, wh] of channelOneWebhooks) {
        if (await webhooks.has(wh.name)) {
          wh.delete();
          deleted++;
        }
      }
    }
    if (!(channelTwoWebhooks.size >0)) {
      for (let [_, wh] of channelTwoWebhooks) {
        if (await webhooks.has(wh.name)) {
          wh.delete();
          deleted++;
        }
      }
    }
    return deleted;
  }

  public static async fire(webhook: Webhook, msgData: Message) {
    console.log(webhook.name);
    console.log(webhook.channel?.name);
    try {
      await webhook.send({
        content: msgData.content,
        files: [...msgData.attachments.values() || null],
      });
    } catch (err) {
      console.log(`LOGGED NAME: ${webhook.name}`);
      console.log(`LOGGED CHANNEL NAME: ${webhook.channel?.name}`);
      console.error(`ERR: ${err}`);
    }
  }

  public static async transfer(controller: WebhookManager, oldChannel: TextChannel, newChannel: TextChannel): Promise<void> {
    if (!(controller.getSize() > 0)) {
      console.log('Controller is empty.');
      return;
    }
    for (let webhook of controller.webhooks) {
      if (webhook.channel && webhook.channel.id === oldChannel.id)  {
        await controller.addFrom(webhook, newChannel);
      }
    }
  }

  public async addFrom(webhook: Webhook, channel: TextChannel): Promise<Webhook | void> {
    let existingIndex: number = this.webhooks.findIndex(webhook => webhook.name.toUpperCase() === webhook.name.toUpperCase() && webhook.channelId === channel.id);
    if (existingIndex === -1) {
      let newWebhook = await channel.createWebhook({
        name: webhook.name,
        avatar: webhook.avatarURL(),
      });
      this.webhooks.push(newWebhook);
      webhook.delete();
      let marked = this.webhooks[existingIndex];
      this.webhooks = this.webhooks.filter(webhook => webhook !== marked);
      return newWebhook;
    }
    console.log('User is already added.');
  }

  public async add(msgData: Message, channel: TextChannel): Promise<Webhook | void> {
    let user = msgData.author;
    // method refers to user; cannot destructure
    let { username, displayAvatarURL: getAvatar } = user;
    let existingIndex: number = this.webhooks.findIndex(webhook => webhook.name.toUpperCase() === username.toUpperCase() && webhook.channelId === channel.id);
    if (existingIndex === -1) {
      let newWebhook = await channel.createWebhook({
        name: username,
        avatar: user.displayAvatarURL(),
      });
      this.webhooks.push(newWebhook);
      return newWebhook;
    }
    console.log('User is already added.');
  }

  public get(identifier: string, channel: TextChannel): Webhook {
    if (!this.has(identifier, channel)) {
      throw new Error(`No webhook of identifier "${identifier}" found`);
    }
    return this.webhooks[this.getIndex(identifier, channel)];
  }

  private getIndex(user: string, channel: TextChannel): number {
    for (let i = 0; i < this.webhooks.length; i++) {
      if (user.toUpperCase() === this.webhooks[i].name.toUpperCase() && channel.id === this.webhooks[i].channelId) {
        return i;
      }
    }
    return -1;
  }

  public getSize() {
    return this.webhooks.length;
  }

  public async remove(user: string, channel: TextChannel): Promise<Webhook | void> {
    if (!this.has(user)) {
      throw new Error('User isn\'t recorded.');
    }
    let webhookIndex = this.getIndex(user, channel);
    this.webhooks[webhookIndex].delete();
  }

  public eradicate(): void {
    if (this.webhooks.length > 0) {
      for (let webhook of this.webhooks) {
        webhook.delete();
      }
    }
  }

  public async has(identifier: string, channel?: TextChannel): Promise<boolean> {
    // console.log('Function executed.');
    if (channel) {
      // console.log('Channel detected.');
      for await (let webhook of this.webhooks) {
        // console.log(`Passed: ${webhook.name}`);
        if (webhook.name.toUpperCase() === identifier.toUpperCase()) {
          // console.log(`${webhook.name.toUpperCase()}_0 matches with ${identifier.toUpperCase()}_0`);
          // console.log(`Passed ${webhook.channel!.id} with ${channel.id}`);
          if (webhook.channel && webhook.channel.id === channel.id) {
            // console.log(`${webhook.channel!.id}_0 matches with ${channel.id}_1`);
            return true;
          }
        }
      }
      return false;
    } else if (!channel) {
      // console.log('Channel undetected.');
      for (let webhook of this.webhooks) {
        if (webhook.name.toUpperCase() === identifier.toUpperCase()) {
          return true;
        }
      }
    }
    return false;
  }
}
