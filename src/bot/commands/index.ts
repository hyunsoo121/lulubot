import {
  ChatInputCommandInteraction,
  Collection,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import * as register from './account/register';
import * as myinfo from './account/myinfo';
import * as create from './match/create';
import * as record from './stats/record';
import * as ranking from './stats/ranking';
import * as scan from './stats/scan';
import * as globalRecord from './stats/globalRecord';
import * as recentMatch from './stats/recentMatch';

interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = new Collection<string, Command>();

const commandList: Command[] = [
  register,
  myinfo,
  create,
  record,
  ranking,
  scan,
  globalRecord,
  recentMatch,
];

for (const command of commandList) {
  commands.set(command.data.name, command);
}
