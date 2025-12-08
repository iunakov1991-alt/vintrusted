const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports.buildPillars = function(topics) {
  const pillarDir = path.join(__dirname, "..", "..", "public", "pillar");
  ensureDir(pillarDir);
  
  topics.forEach(t => {
    const slug = t.toLowerCase().replace(/ /g, "-");
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t} — Guide</title>
  <link rel="stylesheet" href="/seo.css">
</head>
<body>
  <header class="seo-header">
    <div class="seo-container">
      <img id="site-logo" src="/logo.svg" alt="Vintrusted" height="32" />
    </div>
  </header>
  <main class="seo-main">
    <div class="seo-container">
      <h1>${t} — Full Guide</h1>
      <p>Authoritative knowledge hub for: ${t}</p>
    </div>
  </main>
</body>
</html>`;
    fs.writeFileSync(path.join(pillarDir, `${slug}.html`), html);
  });
};











