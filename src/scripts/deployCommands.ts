import 'dotenv/config';
import { deploySlashCommands } from '../bot/deploySlashCommands';

deploySlashCommands()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Deploy] 오류:', err);
    process.exit(1);
  });
