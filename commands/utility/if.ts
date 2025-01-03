import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import {scheduler} from "timers/promises";

export const command = {
	data: new SlashCommandBuilder()
	.setName('if')
	.setDescription('if'),
	async execute(interaction: ChatInputCommandInteraction) {
		const IF = `If you can keep your head when all about you\n    Are losing theirs and blaming it on you,\nIf you can trust yourself when all men doubt you,\n    But make allowance for their doubting too;\nIf you can wait and not be tired by waiting,\n    Or being lied about, don’t deal in lies,\nOr being hated, don’t give way to hating,\n    And yet don’t look too good, nor talk too wise:\n\nIf you can dream—and not make dreams your master;\n    If you can think—and not make thoughts your aim;\nIf you can meet with Triumph and Disaster\n    And treat those two impostors just the same;\nIf you can bear to hear the truth you’ve spoken\n    Twisted by knaves to make a trap for fools,\nOr watch the things you gave your life to, broken,\n    And stoop and build ’em up with worn-out tools:\n\nIf you can make one heap of all your winnings\n    And risk it on one turn of pitch-and-toss,\nAnd lose, and start again at your beginnings \n    And never breathe a word about your loss; \nIf you can force your heart and nerve and sinew\n    To serve your turn long after they are gone,\nAnd so hold on when there is nothing in you\n    Except the Will which says to them: ‘Hold on!’\n\nIf you can talk with crowds and keep your virtue,\n    Or walk with Kings—nor lose the common touch,\nIf neither foes nor loving friends can hurt you,\n    If all men count with you, but none too much;\nIf you can fill the unforgiving minute\n    With sixty seconds’ worth of distance run,\nYours is the Earth and everything that’s in it,\n    And—which is more—you’ll be a Man, my son!
		`
		let channel = interaction.channel as TextChannel;
		channel.sendTyping();
		interaction.deferReply();
		await scheduler.wait(7000);
		interaction.followUp(IF);
	}
}

