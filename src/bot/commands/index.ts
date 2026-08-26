import {
  ChatInputCommandInteraction,
  Collection,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import * as register from './account/register';
import * as memberRegister from './account/memberRegister';
import * as myinfo from './account/myinfo';
import * as side from './match/side';
import * as record from './stats/record';
import * as ranking from './stats/ranking';
import * as overallRanking from './stats/overallRanking';
import * as scan from './stats/scan';
import * as globalRecord from './stats/globalRecord';
import * as recentMatch from './stats/recentMatch';
import * as mostChampions from './stats/mostChampions';
import * as titles from './stats/titles';
import * as laneRanking from './stats/laneRanking';
import * as titleRanking from './stats/titleRanking';
import * as championRanking from './stats/championRanking';
import * as banPickRate from './stats/banPickRate';
import * as compare from './stats/compare';
import * as duo from './stats/duo';
import * as deleteAccount from './account/deleteAccount';
import * as scanAll from './admin/scanAll';

interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands = new Collection<string, Command>();

const commandList: Command[] = [
  register,
  memberRegister,
  myinfo,
  side,
  record,
  ranking,
  overallRanking,
  scan,
  globalRecord,
  recentMatch,
  mostChampions,
  titles,
  laneRanking,
  titleRanking,
  championRanking,
  banPickRate,
  compare,
  duo,
  deleteAccount,
  scanAll,
];

for (const command of commandList) {
  commands.set(command.data.name, command);
}
