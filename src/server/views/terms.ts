import { layout } from './layout';

const body = `
<div class="container">
  <div class="badge">Last updated: January 2025</div>
  <h1>Terms of Service</h1>
  <p>By using LuluBot ("the Bot"), you agree to the following terms.</p>

  <hr class="divider" />

  <h2>1. Overview</h2>
  <p>LuluBot is a <strong>free, non-commercial</strong> Discord bot that tracks League of Legends custom game statistics using the Riot Games API. It is intended for use by Korean LoL custom game (내전) communities. LuluBot only processes <strong>Custom Game matches</strong> — ranked, normal, and ARAM data is never collected or stored.</p>

  <hr class="divider" />

  <h2>2. Acceptable Use</h2>
  <ul>
    <li>You may only register Riot accounts that you own or have explicit permission to register.</li>
    <li>Server administrators or designated members may register accounts on behalf of other members.</li>
    <li>You must not use the Bot or its data for any commercial purposes. LuluBot is provided entirely free of charge with no monetization.</li>
    <li>You must not attempt to abuse, overload, or exploit the Bot's services.</li>
  </ul>

  <hr class="divider" />

  <h2>3. Data Ownership</h2>
  <ul>
    <li>Match data is sourced from Riot Games and remains the intellectual property of Riot Games.</li>
    <li>Users may delete their stored data at any time using the <code>/계정삭제</code> command.</li>
  </ul>

  <hr class="divider" />

  <h2>4. Service Availability</h2>
  <p>The Bot is provided as-is. We reserve the right to modify, suspend, or discontinue the service at any time without prior notice. We are not liable for any loss resulting from service interruption.</p>

  <hr class="divider" />

  <h2>5. Disclaimer</h2>
  <ul>
    <li>Statistics and data provided by the Bot are for informational purposes only and accuracy is not guaranteed.</li>
    <li>We are not responsible for delays or errors caused by Riot Games API outages or policy changes.</li>
    <li>LuluBot is not affiliated with or endorsed by Riot Games.</li>
  </ul>

  <hr class="divider" />

  <h2>6. Changes to Terms</h2>
  <p>These terms may be updated at any time. Continued use of the Bot after changes constitutes acceptance of the updated terms.</p>

  <hr class="divider" />

  <h2>7. Contact</h2>
  <p>For any questions, please contact us at <a href="mailto:ggom131@gmail.com">ggom131@gmail.com</a>.</p>
</div>
`;

export const termsHtml = layout('Terms of Service', body);
