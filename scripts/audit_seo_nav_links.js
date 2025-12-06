#!/usr/bin/env node
/**
 * SEO Navigation Audit Script
 * 
 * Проверяет наличие всех критических SEO-элементов на страницах:
 * - Header navigation
 * - Footer navigation
 * - Related links
 * - TOC
 * - Breadcrumbs
 * - Schema.org
 * - Hreflang
 * - Canonical
 * - Open Graph
 * 
 * Usage:
 *   node scripts/audit_seo_nav_links.js --paths "path1,path2" --out tmp/seo_nav_audit_report.json
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = { paths: [], out: "tmp/seo_nav_audit_report.json" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === "--paths" && val) {
      args.paths = val.split(",").map(p => p.trim());
      i += 1;
    } else if (key === "--out" && val) {
      args.out = val;
      i += 1;
    }
  }
  return args;
}

function auditPage(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const report = {
    path: htmlPath,
    has_header_nav: false,
    has_footer_nav: false,
    has_related_links: false,
    has_toc: false,
    has_breadcrumbs: false,
    has_schema_webpage: false,
    has_schema_faq: false,
    has_schema_breadcrumb: false,
    has_hreflang: false,
    has_canonical: false,
    has_og_tags: false,
    has_anchors: false,
    h1_count: 0,
    h2_count: 0,
    internal_links_count: 0,
    errors: []
  };

  // Header navigation
  report.has_header_nav = /seo-page__topbar|header|topbar/i.test(html) &&
    /logo|VIN Trust/i.test(html) &&
    /Home|href="\/"/.test(html);

  // Footer navigation
  report.has_footer_nav = /seo-footer|footer/i.test(html) &&
    /VIN Trust|Privacy|Terms/i.test(html);

  // Related links
  report.has_related_links = /related|artículos relacionados|related articles/i.test(html) &&
    /<a href=.*>.*<\/a>/.test(html);
  const relatedLinks = html.match(/<a href="[^"]*">[^<]*<\/a>/g) || [];
  report.internal_links_count = relatedLinks.filter(link => 
    !link.includes('href="/"') && !link.includes('href="#')
  ).length;

  // TOC
  report.has_toc = /seo-toc|table.*contents|contents|toc/i.test(html) &&
    /<a href="#/.test(html);

  // Breadcrumbs
  report.has_breadcrumbs = /seo-breadcrumbs|breadcrumb/i.test(html) &&
    /<a href=.*>.*<\/a>/.test(html);

  // Schema.org
  report.has_schema_webpage = /"@type"\s*:\s*"(WebPage|Article)"/.test(html);
  report.has_schema_faq = /"@type"\s*:\s*"FAQPage"/.test(html);
  report.has_schema_breadcrumb = /"@type"\s*:\s*"BreadcrumbList"/.test(html);

  // Hreflang
  report.has_hreflang = /rel="alternate"\s+hreflang|rel='alternate'\s+hreflang/i.test(html);

  // Canonical
  report.has_canonical = /rel="canonical"|rel='canonical'/.test(html);

  // Open Graph
  report.has_og_tags = /property="og:title"|property='og:title'|og:title/i.test(html);

  // Anchors (id attributes on headings)
  report.has_anchors = /<h[2-6][^>]*id=/.test(html);

  // Heading counts
  report.h1_count = (html.match(/<h1[^>]*>/gi) || []).length;
  report.h2_count = (html.match(/<h2[^>]*>/gi) || []).length;

  // Errors
  if (report.h1_count !== 1) {
    report.errors.push(`H1 count should be 1, found ${report.h1_count}`);
  }
  if (!report.has_canonical) {
    report.errors.push("Missing canonical URL");
  }
  if (!report.has_schema_webpage) {
    report.errors.push("Missing Schema.org WebPage");
  }

  return report;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.paths.length === 0) {
    // По умолчанию проверяем несколько тестовых страниц
    const rootDir = path.resolve(__dirname, "..");
    const defaultPaths = [
      "public/semantic-pages/en/dmv-titles/ca/title-types/checklist/index.html",
      "public/semantic-pages/es/dmv-titles/ca/title-types/checklist/index.html"
    ];
    args.paths = defaultPaths.map(p => path.join(rootDir, p));
  }

  const reports = [];
  for (const htmlPath of args.paths) {
    const fullPath = path.isAbsolute(htmlPath) 
      ? htmlPath 
      : path.join(process.cwd(), htmlPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`[WARN] File not found: ${fullPath}`);
      continue;
    }

    try {
      const report = auditPage(fullPath);
      reports.push(report);
      console.error(`[OK] Audited: ${htmlPath}`);
    } catch (e) {
      console.error(`[ERR] Failed to audit ${htmlPath}: ${e.message}`);
    }
  }

  const outPath = path.isAbsolute(args.out) 
    ? args.out 
    : path.join(process.cwd(), args.out);
  
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(reports, null, 2));
  
  console.error(`[DONE] Audit report saved → ${outPath}`);
  console.error(`[INFO] Audited ${reports.length} pages`);
  
  // Summary
  const summary = {
    total: reports.length,
    with_header: reports.filter(r => r.has_header_nav).length,
    with_footer: reports.filter(r => r.has_footer_nav).length,
    with_related: reports.filter(r => r.has_related_links).length,
    with_toc: reports.filter(r => r.has_toc).length,
    with_breadcrumbs: reports.filter(r => r.has_breadcrumbs).length,
    with_schema: reports.filter(r => r.has_schema_webpage).length,
    with_hreflang: reports.filter(r => r.has_hreflang).length,
    with_canonical: reports.filter(r => r.has_canonical).length,
    with_og: reports.filter(r => r.has_og_tags).length
  };
  
  console.error("\n[SUMMARY]");
  console.error(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { auditPage };

