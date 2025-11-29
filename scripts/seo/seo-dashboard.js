
const fs = require('fs');

const path = require('path');

const { log } = require('./logger');



function writeDashboard(buildMeta, pages, acceptedPages) {

  const dataPath = path.join(process.cwd(), 'public/internal/seo-dashboard-data.json');

  const htmlPath = path.join(process.cwd(), 'public/internal/seo-dashboard.html');



  const avgQuality =

    acceptedPages.reduce((acc, p) => acc + (p.qualityScore || 0), 0) /

      Math.max(acceptedPages.length, 1) || 0;



  const byIntent = {};

  for (const p of acceptedPages) {

    if (!byIntent[p.intent]) byIntent[p.intent] = { scoreSum: 0, count: 0 };

    byIntent[p.intent].scoreSum += p.qualityScore || 0;

    byIntent[p.intent].count++;

  }

  const intentStats = {};

  for (const k of Object.keys(byIntent)) {

    intentStats[k] = {

      count: byIntent[k].count,

      avgQuality: byIntent[k].scoreSum / byIntent[k].count

    };

  }



  const payload = {

    buildId: buildMeta.buildId,

    startedAt: buildMeta.startedAt,

    finishedAt: buildMeta.finishedAt,

    pagesPlanned: pages.length,

    pagesAccepted: acceptedPages.length,

    avgQuality,

    intentStats

  };



  fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2));



  const html = `<!doctype html>

<html><head><meta charset="utf-8"><title>SEO Dashboard</title></head>

<body>

<h1>SEO Dashboard</h1>

<pre id="data"></pre>

<script>

fetch('./seo-dashboard-data.json').then(r => r.json()).then(d => {

  document.getElementById('data').textContent = JSON.stringify(d, null, 2);

});

</script>

</body></html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');

  log('DASH', 'Dashboard updated');

}



module.exports = { writeDashboard };

