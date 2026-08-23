import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('진영선택')
  .setDescription('이미 나눈 두 팀 중 어느 쪽이 블루/레드인지 랜덤으로 정합니다.')
  .addUserOption((option) =>
    option.setName('팀장1').setDescription('첫 번째 팀 대표').setRequired(true),
  )
  .addUserOption((option) =>
    option.setName('팀장2').setDescription('두 번째 팀 대표').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const captain1 = interaction.options.getUser('팀장1', true);
  const captain2 = interaction.options.getUser('팀장2', true);

  if (captain1.id === captain2.id) {
    await interaction.reply({
      content: '❌ 같은 사람을 두 번 지정할 수 없습니다.',
      ephemeral: true,
    });
    return;
  }

  const blueFirst = Math.random() < 0.5;
  const blue = blueFirst ? captain1 : captain2;
  const red = blueFirst ? captain2 : captain1;

  const embed = new EmbedBuilder()
    .setTitle('🎲 진영 선택')
    .addFields(
      { name: '🔵 블루팀', value: `${blue}`, inline: true },
      { name: '🔴 레드팀', value: `${red}`, inline: true },
    )
    .setColor(0x5865f2)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
