import { ChatInputCommandInteraction, Collection, SlashCommandBuilder } from 'discord.js';
import * as register from './account/register';
import * as myinfo from './account/myinfo';
import * as create from './match/create';
import * as record from './stats/record';
import * as ranking from './stats/ranking';

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = new Collection<string, Command>();

const commandList: Command[] = [register, myinfo, create, record, ranking];

for (const command of commandList) {
  commands.set(command.data.name, command);
}
