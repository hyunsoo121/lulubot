import { layout } from './layout';

const body = `
<div class="container">
  <div class="hero">
    <h1>LuluBot 🤖</h1>
    <p>A Discord bot for tracking custom game (내전) statistics in the Korean League of Legends community.</p>
    <a class="btn" href="https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=2147483648&scope=bot%20applications.commands" target="_blank">
      Add to Discord
    </a>
    <p style="margin-top: 20px; font-size: 1rem;">
      <a href="/privacy" style="color:#7c8dff;text-decoration:underline;">Privacy Policy</a> &nbsp;·&nbsp; <a href="/terms" style="color:#7c8dff;text-decoration:underline;">Terms of Service</a>
    </p>
  </div>

  <div style="background:#16162a;border:1px solid #2a2a45;border-radius:12px;padding:20px 28px;margin:0 0 40px;display:flex;flex-wrap:wrap;gap:24px;">
    <div style="display:flex;align-items:center;gap:8px;font-size:0.9rem;color:#9a9dbf;">
      <span style="color:#4ade80;font-size:1.1rem;">✓</span>
      <span><strong style="color:#e2e2f0;">Free &amp; non-commercial</strong> — no ads, no fees</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;font-size:0.9rem;color:#9a9dbf;">
      <span style="color:#4ade80;font-size:1.1rem;">✓</span>
      <span><strong style="color:#e2e2f0;">Custom games only</strong> — ranked &amp; normal game data is never collected</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;font-size:0.9rem;color:#9a9dbf;">
      <span style="color:#4ade80;font-size:1.1rem;">✓</span>
      <span><strong style="color:#e2e2f0;">Your data, your control</strong> — delete everything anytime with <code style="font-size:0.85rem;color:#7c8dff;">/계정삭제</code></span>
    </div>
  </div>

  <div class="features">
    <div class="feature-card">
      <div class="icon">📊</div>
      <h3>Match Statistics</h3>
      <p>Automatically collects custom game data and analyzes KDA, damage, vision score, and many more metrics.</p>
    </div>
    <div class="feature-card">
      <div class="icon">🏅</div>
      <h3>Title System</h3>
      <p>Awards 40+ titles such as DPM Machine, Kingmaker, and Dragon Hunter based on accumulated stats.</p>
    </div>
    <div class="feature-card">
      <div class="icon">🏆</div>
      <h3>Rankings</h3>
      <p>Provides server-wide rankings by win rate, KDA, and position-specific metrics.</p>
    </div>
    <div class="feature-card">
      <div class="icon">🤝</div>
      <h3>Duo Statistics</h3>
      <p>Tracks win rates and game counts for every duo combination, both as teammates and opponents.</p>
    </div>
  </div>

  <h2>Riot APIs Used</h2>
  <table class="api-table">
    <thead>
      <tr>
        <th>API</th>
        <th>Endpoint</th>
        <th>Purpose</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Account v1</td>
        <td><code>/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}</code></td>
        <td>Resolve PUUID from Riot ID when a user registers their account</td>
      </tr>
      <tr>
        <td>Match v5</td>
        <td><code>/lol/match/v5/matches/by-puuid/{puuid}/ids</code></td>
        <td>Fetch the list of custom game match IDs for a player</td>
      </tr>
      <tr>
        <td>Match v5</td>
        <td><code>/lol/match/v5/matches/{matchId}</code></td>
        <td>Fetch full match details (participants, stats, timeline metadata)</td>
      </tr>
      <tr>
        <td>League v4</td>
        <td><code>/lol/league/v4/entries/by-puuid/{puuid}</code></td>
        <td>Display ranked tier (Solo/Flex) on the player profile command</td>
      </tr>
    </tbody>
  </table>

  <h2>Commands</h2>
  <div class="commands">
    <div class="command-row">
      <span class="command-name">/계정등록</span>
      <span>Link a Riot account to the bot</span>
    </div>
    <div class="command-row">
      <span class="command-name">/전적갱신</span>
      <span>Scan and update match history</span>
    </div>
    <div class="command-row">
      <span class="command-name">/전적</span>
      <span>View personal stats and earned titles</span>
    </div>
    <div class="command-row">
      <span class="command-name">/랭킹</span>
      <span>View server-wide player rankings</span>
    </div>
    <div class="command-row">
      <span class="command-name">/라인랭킹</span>
      <span>View position-specific metric rankings</span>
    </div>
    <div class="command-row">
      <span class="command-name">/칭호</span>
      <span>View all title holders in the server</span>
    </div>
    <div class="command-row">
      <span class="command-name">/칭호순위</span>
      <span>View full rankings for a specific title</span>
    </div>
    <div class="command-row">
      <span class="command-name">/듀오</span>
      <span>View duo combination win rates</span>
    </div>
    <div class="command-row">
      <span class="command-name">/최근경기</span>
      <span>View recent custom game results</span>
    </div>
  </div>

  <h2>Screenshots</h2>
  <div class="screenshots">
    <div class="screenshot-item">
      <img src="/screenshots/stats.png" alt="Player stats command" />
      <div class="caption">/전적 — View personal stats and earned titles</div>
    </div>
    <div class="screenshot-item">
      <img src="/screenshots/ranking.png" alt="Server ranking command" />
      <div class="caption">/랭킹 — Server-wide player rankings</div>
    </div>
    <div class="screenshot-item">
      <img src="/screenshots/recent.png" alt="Recent games command" />
      <div class="caption">/최근경기 — Recent custom game results</div>
    </div>
  </div>

  <h2>Contact</h2>
  <p>For bug reports or inquiries, please reach out at <a href="mailto:ggom131@gmail.com">ggom131@gmail.com</a>.</p>
</div>
`;

export const landingHtml = layout('Home', body);
