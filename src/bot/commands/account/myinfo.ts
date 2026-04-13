import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { getAccountByDiscordId } from '../../../services/account';

export const data = new SlashCommandBuilder()
  .setName('유저정보')
  .setDescription('연결된 라이엇 계정을 확인합니다.')
  .addUserOption((option) =>
    option.setName('유저').setDescription('조회할 유저 (미입력 시 본인)').setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const target = interaction.options.getUser('유저') ?? interaction.user;
  const discordUserId = BigInt(target.id);
  const isSelf = target.id === interaction.user.id;

  const accounts = await getAccountByDiscordId(discordUserId);

  if (accounts.length === 0) {
    await interaction.editReply(
      isSelf
        ? '등록된 계정이 없습니다. `/등록 닉네임#태그` 로 계정을 연결해주세요.'
        : `${target.displayName} 님은 등록된 계정이 없습니다.`,
    );
    return;
  }

  const title = isSelf ? '내 계정 정보' : `${target.displayName} 계정 정보`;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x5865f2)
    .addFields(
      accounts.map((acc, i) => ({
        name: `계정 ${i + 1}`,
        value: `**${acc.gameName}#${acc.tagLine}**`,
        inline: true,
      })),
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
