import { layout } from './layout';

const body = `
<div class="container">
  <div class="badge">Last updated: January 2025</div>
  <h1>Privacy Policy</h1>
  <p>LuluBot ("the Bot") is a Discord bot for tracking League of Legends custom game statistics. This policy explains what data is collected and how it is used.</p>

  <hr class="divider" />

  <h2>1. Data We Collect</h2>

  <h3>From Discord</h3>
  <ul>
    <li>Discord User ID — to identify users across commands</li>
    <li>Discord Guild (Server) ID — to separate statistics per server</li>
  </ul>

  <h3>From Riot Games API</h3>
  <p>The Bot only collects data for Riot accounts that users explicitly register. <strong>Only Custom Game (내전) matches are collected — ranked, normal, and ARAM games are completely ignored.</strong> The following data is fetched and stored:</p>

  <h3>Account v1</h3>
  <ul>
    <li>PUUID, game name (Riot ID), and tag line</li>
  </ul>

  <h3>Match v5 — Custom Games Only</h3>
  <ul>
    <li>Match ID, game start time, game duration</li>
    <li>Champion ID, assigned position</li>
    <li>Kills, deaths, assists</li>
    <li>CS (minions + neutral minions killed), gold earned</li>
    <li>Total damage dealt to champions, total damage taken</li>
    <li>Vision score, wards placed, wards killed, control wards purchased</li>
    <li>Time spent crowd-controlling others</li>
    <li>Dragon kills, Baron kills, turret kills</li>
    <li>First blood, quadra kills, penta kills</li>
    <li>Solo kills, enemy jungle minions killed, objectives stolen</li>
    <li>Total heals on teammates, total damage shielded on teammates</li>
    <li>Winning team</li>
  </ul>

  <h3>League v4</h3>
  <ul>
    <li>Ranked Solo/Duo and Flex queue tier, rank, and LP — displayed on the player profile command only, not stored permanently</li>
  </ul>

  <hr class="divider" />

  <h2>2. Why We Store Data</h2>
  <p>Match data is stored persistently (not fetched in real-time) because the Bot's core features rely on <strong>cumulative statistics</strong> — win streaks, all-time rankings, title calculations, and duo win rates cannot be derived from a single match and require historical data to be meaningful. Data is only stored for accounts that users voluntarily register.</p>
  <ul>
    <li>Computing and displaying custom game statistics within a Discord server</li>
    <li>Calculating and assigning titles based on accumulated performance across all registered matches</li>
    <li>Generating server rankings and duo combination statistics</li>
  </ul>

  <hr class="divider" />

  <h2>3. Data Retention & Deletion</h2>
  <ul>
    <li>Data is retained for as long as the user's account is registered with the Bot.</li>
    <li>Users can delete all of their data at any time using the <code>/계정삭제</code> command. This permanently and immediately removes their Riot account, all match stats, titles, and rankings from our database.</li>
    <li>LuluBot is a <strong>free, non-commercial service</strong>. No data is monetized, sold, or used for advertising purposes.</li>
  </ul>

  <hr class="divider" />

  <h2>4. Data Sharing</h2>
  <p>We do not sell or share collected data with third parties, except when required by law.</p>

  <hr class="divider" />

  <h2>5. Security</h2>
  <p>Data is stored on secured servers with appropriate access controls to prevent unauthorized access.</p>

  <hr class="divider" />

  <h2>6. Relationship with Riot Games</h2>
  <p>LuluBot is not endorsed or affiliated with Riot Games. The Bot uses the Riot Games API in accordance with the <a href="https://developer.riotgames.com/policies/general" target="_blank">Riot Games Developer Policies</a>.</p>

  <hr class="divider" />

  <h2>7. Contact</h2>
  <p>For any privacy-related questions, please contact us at <a href="mailto:ggom131@gmail.com">ggom131@gmail.com</a>.</p>
</div>
`;

export const privacyHtml = layout('Privacy Policy', body);
