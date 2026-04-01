import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { getAccountByDiscordId } from '../../../services/account';

export const data = new SlashCommandBuilder()
  .setName('내정보')
  .setDescription('연결된 라이엇 계정을 확인합니다.');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const discordUserId = BigInt(interaction.user.id);
  const accounts = await getAccountByDiscordId(discordUserId);

  if (accounts.length === 0) {
    await interaction.editReply(
      '등록된 계정이 없습니다. `/등록 닉네임#태그` 로 계정을 연결해주세요.',
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('내 계정 정보')
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
