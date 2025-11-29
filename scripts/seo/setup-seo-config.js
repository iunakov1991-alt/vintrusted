
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



  const existing = pkg.scripts['vercel-build'];

  if (existing) {

    if (!existing.includes('scripts/seo/seo-master-build.js')) {

      pkg.scripts['vercel-build'] =

        'node scripts/seo/seo-master-build.js && ' + existing;

      log('SETUP', `package.json: vercel-build chained with SEO-monster + old script.`);

    } else {

      log('SETUP', 'package.json: vercel-build already includes SEO-monster.');

    }

  } else {

    pkg.scripts['vercel-build'] = 'node scripts/seo/seo-master-build.js';

    log('SETUP', 'package.json: vercel-build created for SEO-monster only.');

  }



  if (!pkg.scripts['seo-monster']) {

    pkg.scripts['seo-monster'] = 'node scripts/seo/seo-master-build.js';

  }



  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

}



function patchVercelJson() {

  const vercelPath = path.join(process.cwd(), 'vercel.json');

  if (!fs.existsSync(vercelPath)) {

    log('SETUP', 'vercel.json not found, nothing to patch (routing left as-is).');

    return;

  }

  const cfg = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

  cfg.rewrites = cfg.rewrites || [];

  // НЕ добавляем новых rewrites на /vin, /, /articles.

  // Сохраняем существующую конфигурацию Vercel.

  fs.writeFileSync(vercelPath, JSON.stringify(cfg, null, 2));

  log('SETUP', 'vercel.json normalized (rewrites preserved, nothing new added).');

}



patchPackageJson();

patchVercelJson();

