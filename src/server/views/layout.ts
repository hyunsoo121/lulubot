export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — LuluBot</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0e0e1a;
      color: #e2e2f0;
      line-height: 1.7;
    }
    a { color: #7c8dff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    header {
      background: #16162a;
      border-bottom: 1px solid #2a2a45;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    header .logo { font-size: 1.3rem; font-weight: 700; color: #fff; }
    header nav { margin-left: auto; display: flex; gap: 20px; font-size: 0.9rem; }
    .container { max-width: 860px; margin: 0 auto; padding: 48px 24px; }
    h1 { font-size: 2rem; margin-bottom: 12px; color: #fff; }
    h2 { font-size: 1.3rem; margin: 36px 0 10px; color: #c8caff; }
    h3 { font-size: 1.05rem; margin: 24px 0 6px; color: #b0b3d6; }
    p { margin-bottom: 12px; color: #c0c0d8; }
    ul { margin: 8px 0 12px 20px; color: #c0c0d8; }
    ul li { margin-bottom: 4px; }
    .badge {
      display: inline-block;
      background: #2a2a45;
      border: 1px solid #3a3a60;
      border-radius: 6px;
      padding: 2px 10px;
      font-size: 0.8rem;
      color: #9a9dbf;
      margin-bottom: 16px;
    }
    .hero {
      text-align: center;
      padding: 80px 0 60px;
    }
    .hero h1 { font-size: 2.6rem; margin-bottom: 16px; }
    .hero p { font-size: 1.1rem; max-width: 560px; margin: 0 auto 32px; }
    .btn {
      display: inline-block;
      background: #5865f2;
      color: #fff !important;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      text-decoration: none !important;
      transition: background 0.2s;
    }
    .btn:hover { background: #4752c4; }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin: 48px 0;
    }
    .feature-card {
      background: #16162a;
      border: 1px solid #2a2a45;
      border-radius: 12px;
      padding: 24px;
    }
    .feature-card .icon { font-size: 1.8rem; margin-bottom: 10px; }
    .feature-card h3 { margin: 0 0 8px; color: #fff; }
    .feature-card p { margin: 0; font-size: 0.9rem; }
    .commands {
      background: #16162a;
      border: 1px solid #2a2a45;
      border-radius: 12px;
      padding: 24px 28px;
      margin: 32px 0;
    }
    .command-row {
      display: flex;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid #1e1e35;
      font-size: 0.95rem;
    }
    .command-row:last-child { border-bottom: none; }
    .command-name { color: #7c8dff; font-family: monospace; min-width: 160px; }
    .api-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .api-table th, .api-table td {
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid #2a2a45;
      font-size: 0.9rem;
      color: #c0c0d8;
    }
    .api-table th { color: #9a9dbf; font-weight: 600; background: #121220; }
    .api-table code { font-family: monospace; color: #7c8dff; font-size: 0.85rem; }
    footer {
      text-align: center;
      padding: 32px;
      font-size: 0.85rem;
      color: #6065a0;
      border-top: 1px solid #1a1a2e;
      margin-top: 60px;
    }
    .divider { border: none; border-top: 1px solid #2a2a45; margin: 32px 0; }
  </style>
</head>
<body>
  <header>
    <span class="logo">🤖 LuluBot</span>
    <nav>
      <a href="/">Home</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
    </nav>
  </header>
  ${body}
  <footer>
    © 2025 LuluBot &nbsp;·&nbsp; <a href="/privacy">Privacy Policy</a> &nbsp;·&nbsp; <a href="/terms">Terms of Service</a> &nbsp;·&nbsp; <a href="mailto:ggom131@gmail.com">Contact</a>
  </footer>
</body>
</html>`;
}
