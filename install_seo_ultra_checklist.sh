#!/usr/bin/env bash

# ==========================================================
# MONSTER8 — SEO ULTRA CHECKLIST INSTALL
# ==========================================================

set -euo pipefail

mkdir -p config scripts docs tmp

cat > config/seo_ultra_checklist.json << 'EOF'
{
  "meta": {
    "version": "1.0",
    "scope": "VIN Trust / MONSTER8",
    "description": "Ultra-wide SEO checklist covering on-page, technical, UX, schema, international, Core Web Vitals, E-E-A-T and VIN-specific features."
  },
  "groups": [
    {
      "id": "meta_basics",
      "name": "Meta & Head Basics",
      "checks": [
        { "id": "META_TITLE_EXISTS", "severity": "critical", "text": "Meta <title> is present." },
        { "id": "META_TITLE_LENGTH", "severity": "major", "text": "Meta <title> length 50–60 characters." },
        { "id": "META_TITLE_PRIMARY_KW", "severity": "major", "text": "Primary keyword appears in <title> near the beginning." },
        { "id": "META_TITLE_BRAND_SUFFIX", "severity": "minor", "text": "Brand name appended in title (e.g., \"| VIN Trust\")." },
        { "id": "META_DESC_EXISTS", "severity": "critical", "text": "Meta description is present." },
        { "id": "META_DESC_LENGTH", "severity": "major", "text": "Meta description length 140–160 characters." },
        { "id": "META_DESC_KW", "severity": "major", "text": "Primary query intent reflected in meta description." },
        { "id": "META_DESC_CTA", "severity": "minor", "text": "Meta description contains soft CTA (e.g., \"Check VIN now\")." },
        { "id": "META_VIEWPORT", "severity": "critical", "text": "<meta name=\"viewport\"> correctly configured for mobile." },
        { "id": "META_CHARSET_UTF8", "severity": "critical", "text": "<meta charset=\"utf-8\"> is present." },
        { "id": "META_ROBOTS_NOT_BLOCKING", "severity": "critical", "text": "No meta robots=noindex/nofollow on indexable pages." },
        { "id": "META_CANONICAL", "severity": "critical", "text": "Correct canonical points to single canonical URL." },
        { "id": "META_OG_BASIC", "severity": "major", "text": "og:title, og:description, og:type, og:url are set." },
        { "id": "META_OG_IMAGE", "severity": "major", "text": "og:image exists, has correct size and aspect ratio." },
        { "id": "META_TWITTER_CARD", "severity": "minor", "text": "Twitter Card meta (summary_large_image) configured." },
        { "id": "META_LANG_HTML", "severity": "major", "text": "<html lang=\"en\"> / \"es\" matches actual page language." },
        { "id": "META_FAVICON", "severity": "minor", "text": "Favicon linked in <head>." },
        { "id": "META_THEME_COLOR", "severity": "minor", "text": "theme-color set and matches main brand color." }
      ]
    },
    {
      "id": "schema_structured_data",
      "name": "Schema.org / Structured Data",
      "checks": [
        { "id": "SCHEMA_WEBPAGE", "severity": "major", "text": "WebPage schema present with name, description, inLanguage, url." },
        { "id": "SCHEMA_ORGANIZATION", "severity": "minor", "text": "Organization/Brand schema for VIN Trust (name, url, logo, contact)." },
        { "id": "SCHEMA_SEARCHACTION_VIN", "severity": "major", "text": "SearchAction for VIN form: target with VIN parameter." },
        { "id": "SCHEMA_JSONLD_VALID", "severity": "critical", "text": "JSON-LD is valid (checked via Google Rich Results Test)." }
      ]
    },
    {
      "id": "performance_cwv",
      "name": "Performance & Core Web Vitals",
      "checks": [
        { "id": "PERF_IMAGE_LAZYLOAD", "severity": "major", "text": "Below-fold images load lazily (loading=\"lazy\")." },
        { "id": "PERF_NO_HUGE_IMAGES", "severity": "major", "text": "No 4000px+ images inserted in small blocks without resize." },
        { "id": "PERF_JS_BUNDLE_SIZE", "severity": "major", "text": "JS bundle optimized (no unnecessary megabytes)." }
      ]
    },
    {
      "id": "vintrust_specific",
      "name": "VIN Trust – Product & Conversion Features",
      "checks": [
        { "id": "VT_HERO_VIN_FORM", "severity": "critical", "text": "Target pages have hero section with VIN form (input + CTA)." },
        { "id": "VT_VALUE_PROPOSITION", "severity": "major", "text": "Clear value proposition: cheap and detailed VIN report." },
        { "id": "VT_CTA_TOP", "severity": "major", "text": "CTA in top section of page." },
        { "id": "VT_NO_DARK_PATTERNS", "severity": "critical", "text": "No hidden subscriptions, deceptive buttons, price confusion." }
      ]
    }
  ]
}
EOF

cat > scripts/seo_ultra_lint.sh << 'EOF'
#!/usr/bin/env bash

# ==========================================================
# MONSTER8 SEO ULTRA LINTER (SKELETON)
# ==========================================================

set -euo pipefail

CHECKLIST_FILE="config/seo_ultra_checklist.json"

if [ ! -f "$CHECKLIST_FILE" ]; then
  echo "ERROR: $CHECKLIST_FILE not found. Run install_seo_ultra_checklist.sh first."
  exit 1
fi

PAGE_PATH="${1:-}"

if [ -z "$PAGE_PATH" ]; then
  echo "Usage: $0 path/to/page.html"
  echo "This is a skeleton; Cursor should implement real checks."
  exit 1
fi

echo "=== MONSTER8 SEO ULTRA LINTER ==="
echo "Page: $PAGE_PATH"
echo "Checklist: $CHECKLIST_FILE"
echo

jq -c '.groups[]' "$CHECKLIST_FILE" | while read -r group; do
  gid=$(echo "$group" | jq -r '.id')
  gname=$(echo "$group" | jq -r '.name')
  echo "----------------------------------------"
  echo "GROUP: $gid — $gname"
  echo "----------------------------------------"

  echo "$group" | jq -c '.checks[]' | while read -r check; do
    cid=$(echo "$check" | jq -r '.id')
    severity=$(echo "$check" | jq -r '.severity')
    text=$(echo "$check" | jq -r '.text')

    printf "[%s][%s] %s\n" "$cid" "$severity" "$text"
  done

  echo
done

echo "Linter skeleton finished. Real checks to be implemented by Cursor."
EOF

chmod +x scripts/seo_ultra_lint.sh

echo "✅ SEO ultra-checklist installed:"
echo "  - config/seo_ultra_checklist.json"
echo "  - scripts/seo_ultra_lint.sh"
echo "Ready. Next step: implement real checks in the linter."

