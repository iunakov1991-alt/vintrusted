
const fs = require('fs');

const path = require('path');

const { log } = require('./logger');



function patchPackageJson() {

  const pkgPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(pkgPath)) {

    log('SETUP', 'package.json not found, skipping.');

    return;

  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  pkg.scripts = pkg.scripts || {};

  pkg.scripts['vercel-build'] = 'node scripts/seo/seo-master-build.js';

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  log('SETUP', 'package.json updated: vercel-build script set.');

}



function patchVercelJson() {

  const vercelPath = path.join(process.cwd(), 'vercel.json');

  let cfg = {};

  if (fs.existsSync(vercelPath)) {

    cfg = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

  }

  cfg.rewrites = cfg.rewrites || [];



  const needed = [

    { source: '/articles/:slug*', destination: '/seo/pages/articles/:slug*/index.html' },

    { source: '/vin/:vin([A-HJ-NPR-Z0-9]{17})/:state([a-zA-Z-]+)', destination: '/seo/pages/vin/:vin/:state/index.html' },

    { source: '/vin/:vin([A-HJ-NPR-Z0-9]{17})', destination: '/seo/pages/vin/:vin/index.html' }

  ];



  const existingSources = new Set(cfg.rewrites.map((r) => r.source));

  for (const r of needed) {

    if (!existingSources.has(r.source)) {

      cfg.rewrites.push(r);

    }

  }



  fs.writeFileSync(vercelPath, JSON.stringify(cfg, null, 2));

  log('SETUP', 'vercel.json updated with SEO rewrites (existing rules preserved).');

}



patchPackageJson();

patchVercelJson();

