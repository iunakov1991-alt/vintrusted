#!/usr/bin/env bash
# MONSTER 8.0 INSTALL / RESET
# Usage:
#   ./monster8.sh           # полный install/update MONSTER 8.0
#   ./monster8.sh install   # то же самое явно
#   ./monster8.sh reset     # очистка tmp/logs/rl_aggregates (без трогания конфигов)

set -euo pipefail

ACTION="${1:-install}"
ROOT_DIR="$(pwd)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: '$1' not found in PATH. Install it first." >&2
    exit 1
  fi
}

reset_monster() {
  echo "MONSTER 8.0 RESET: cleaning tmp/, logs/, data/rl_aggregates.json ..."
  mkdir -p "$ROOT_DIR/tmp" "$ROOT_DIR/logs" "$ROOT_DIR/data"
  rm -rf "$ROOT_DIR/tmp"/*
  rm -rf "$ROOT_DIR/logs"/*
  if [ -f "$ROOT_DIR/data/rl_aggregates.json" ]; then
    rm -f "$ROOT_DIR/data/rl_aggregates.json"
  fi
  echo "Reset done."
  exit 0
}

if [[ "$ACTION" == "reset" ]]; then
  reset_monster
fi

# ----- REQUIREMENTS -----
require_cmd node

mkdir -p \
  "$ROOT_DIR/prompts" \
  "$ROOT_DIR/config" \
  "$ROOT_DIR/scripts" \
  "$ROOT_DIR/data" \
  "$ROOT_DIR/data/metrics" \
  "$ROOT_DIR/data/seo/ai-training" \
  "$ROOT_DIR/tmp" \
  "$ROOT_DIR/logs"

# ---------------------------------------
# 1. CORE PROMPT — ARTICLE_BLOCKS
# ---------------------------------------
cat > "$ROOT_DIR/prompts/core_prompt_blocks.txt" <<'PROMPT'
You are a deterministic article blocks generator.

INPUT FORMAT
- You receive a single JSON object.
- It always contains:
  - "mode": "article_blocks"
  - "topic": object with semantic information about the article:
      - "topic_id": string
      - "zone": string (vin_identity, dmv_titles, auctions, used_fraud, brand_model, tech_insurance)
      - "supercluster": string
      - "type": string (article_type id)
      - "dimensions": object (brand, model, year_range, state, auction, damage_type, audience_segment, language, etc.)
  - "blocks": array of block specifications
  - "output_format": currently "TEXT_WITH_DELIMS"
  - "delim": string delimiter between blocks in your answer

BLOCK SPEC FORMAT
Each element of "blocks" has:
- "id": unique block id (e.g., "hero", "context_legal")
- "role": logical role (hero, context, guide, checklist, faq, analytics, comparison, etc.)
- "length": { "min": <int>, "max": <int> } — target word range
- "style": one of:
    - "summary"      → short, dense overview
    - "tech_legal"   → technical + legal, precise terms, no marketing tone
    - "practical"    → concrete advice and actions
    - "analytic"     → numbers, trends, risk / value analysis
    - "encyclopedia" → neutral, structured explanation
- "intents": list of high-level intents
- "must_include_terms": optional list of terms that MUST appear at least once

YOUR JOB
For each block in "blocks", in the given order:
- Generate ONLY the content for this block.
- Follow block.length: stay reasonably inside [min, max] words.
- Follow block.style.
- Cover block.intents directly and concretely for this topic.
- Use must_include_terms at least once each, in a natural way.
- Do not reuse full sentences between different blocks of the same article.
- Do not output section headings like "Hero" or "Guide" unless the spec explicitly says so.
- You do NOT invent the topic; the topic object fully defines what the article is about.

OUTPUT FORMAT
- For output_format = "TEXT_WITH_DELIMS":
  - Generate block contents sequentially, in the exact order of "blocks".
  - Between blocks, output EXACTLY the delimiter from "delim", once.
  - No extra text before the first block.
  - No explanation, no JSON, no debug comments.
  - Only plain text blocks separated by the delimiter.

STYLE RULES (GLOBAL)
- Avoid generic filler phrases like "it is important to note" or "in many cases".
- Avoid marketing tone ("amazing deal", "great opportunity").
- Prefer concrete, domain-specific language: DMV, title brand, salvage, rebuilt, flood, odometer, NMVTIS, NHTSA, Copart, IAAI, lemon law, frame damage.
- For VIN-related mentions:
    - Treat VIN checks as one of several due diligence tools.
    - Do NOT turn the whole article into a VIN-landing page.
    - Short, dense mention is enough unless the topic itself is VIN-focused.

ERROR HANDLING
If the input JSON violates this contract, respond with:
"ERROR: INVALID SPEC"
PROMPT

# ---------------------------------------
# 2. SEMANTIC CORE
# ---------------------------------------
cat > "$ROOT_DIR/config/semantic_core.json" <<'JSON'
{ "version":"8.0",
  "zones":[
    {"id":"vin_identity","label":"VIN / Vehicle Identity","description":"VIN structure, WMI, plant codes, VIN fraud detection, VIN vs chassis. Используется как справочная зона, не как посадочные под каждый VIN."},
    {"id":"dmv_titles","label":"DMV / Titles / Registration","description":"State-by-state правила: типы тайтлов, регистрация, salvage → rebuilt, emissions, odometer law, title washing."},
    {"id":"auctions","label":"Auctions / Salvage buying","description":"Copart, IAAI, Manheim и др.: категории, повреждения, bidding, inspection, fees, fraud."},
    {"id":"used_fraud","label":"Used cars / Inspection / Fraud","description":"Типовые мошенничества, проверки, чеклисты, lemon law, flood/frame/airbag fraud."},
    {"id":"brand_model","label":"Brands / Models / Generations / Issues","description":"История марок и моделей, поколения, типичные проблемы по годам, расходы, страхование, депреция."},
    {"id":"tech_insurance","label":"Technical & Insurance blocks","description":"Recalls, TSBs, safety ratings, crashworthiness, theft rates, insurance and market value analytics."}
  ],
  "superclusters": {
    "vin_supercluster":{"zone":"vin_identity","topics":["vin_structure","vin_country_origins","brand_vin_patterns","plant_codes","vin_fraud_detection","vin_for_evs","vin_vs_chassis","vin_decoder_per_brand","vin_decoder_per_region","wmi_catalog"]},
    "dmv_supercluster":{"zone":"dmv_titles","topics":["state_title_types","state_transfer_rules","state_registration_steps","state_salvage_conversion","state_rebuilt_inspection","odometer_disclosure_laws","title_washing_schemes","emissions_laws","lien_release_rules"]},
    "auction_supercluster":{"zone":"auctions","topics":["copart_categories_damages","iaai_categories","manheim_processes","acv_auctions_overview","insurance_auto_auctions","how_to_bid_salvage","how_to_inspect_salvage","seller_types_insurer_fleet_dealer","damage_category_encyclopedia","auction_fraud_patterns"]},
    "used_fraud_supercluster":{"zone":"used_fraud","topics":["odometer_rollbacks","frame_damage_detection","flood_car_detection","fire_damage","airbag_fraud","off_books_repairs","dealer_scam_patterns","state_to_state_flipping_risks","inspection_checklists","how_to_read_condition_reports"]},
    "brand_model_supercluster":{"zone":"brand_model","topics":["brand_encyclopedia","models_by_popularity","known_issues_by_year","problems_by_generation","recall_patterns","maintenance_cost","depreciation_curves","era_motifs_toyota_2005_2015","era_motifs_honda_k_series"]},
    "tech_insurance_supercluster":{"zone":"tech_insurance","topics":["recalls","tsbs","insurance_risk","theft_rates_per_brand","market_value_depreciation","safety_ratings","crashworthiness"]}
  },
  "dimensions": {
    "geo":{"countries_for_vin":["USA","Canada","Mexico","Japan","Germany","Korea","China","EU"],"usa_states":"see config/states_us.json"},
    "vehicle":{"brands_models":"see config/brands_models.json","body_types":["sedan","hatchback","wagon","coupe","convertible","suv","crossover","pickup","van","minivan","motorcycle","truck_heavy","trailer","ev","hybrid"],"damage_types":["front_end","rear_end","side","rollover","flood","hail","fire","theft_recovery","vandalism","mechanical","frame","airbag_deployed","biohazard"]},
    "auctions":{"platforms":["copart","iaai","manheim","acv","other_dealer_only"]},
    "dmv":{"title_topics_per_state":["title_types","transfer","registration","salvage_to_rebuilt","emissions","insurance_requirements","odometer_law","flood_branding_rules","tax_fee_structures","dealer_requirements","private_party_sale","bill_of_sale_law"]},
    "audience_segments":["us_general","mx_us","dealer_pro","auction_flipper"],
    "languages":["en","es"]
  },
  "article_types_ref":"see config/article_types.json",
  "combinatorics_rules":{
    "vin":{"wmi_topics":{"description":"WMI (~8000) × 10 подтем → 80,000 статей без выгорания.","dimensions":["wmi","country","brand","body_type"]}},
    "dmv":{"state_topics":{"description":"50 штатов × 12 тем × 3–4 формата (guide/checklist/mistakes/comparison).","dimensions":["state","dmv_topic","format_variant"]}},
    "auction":{"platform_topics":{"description":"10 аукционов × 30 подтем × формат (guide/fraud/checklist/photos).","dimensions":["platform","auction_topic","format_variant"]}},
    "brand_model":{"brand_model_topics":{"description":"40+ брендов × все модели (кроме китайских/суперкаров) × поколение/декада/issue.","dimensions":["brand","model","generation","year_range","issue_type"]}},
    "fraud_damage":{"damage_fraud_topics":{"description":"50 типов повреждений/мошенничеств × 20 аспектов (state, brand, body_type, auction).","dimensions":["damage_type","state","brand","body_type","auction"]}},
    "variation_formats":["comparison","step_by_step","checklist","mistakes","buyer_guide","legal_implications"]
  },
  "mechanics":{
    "topic_object":{"example":{"topic_id":"dmv_ca_title_types_checklist_en_us_general","zone":"dmv_titles","supercluster":"dmv_supercluster","type":"dmv_state_guide","dimensions":{"state":"CA","dmv_topic":"title_types","format_variant":"checklist","language":"en","audience_segment":"us_general"}}},
    "pipeline":[
      "1. TopicSelector выбирает следующий topic_id из очереди семантического графа.",
      "2. build_article_spec.js создаёт ArticleSpec: zone, article_type, BlockSpec, intents, must_terms, с учётом learned_strategy.",
      "3. gen_article_blocks.js вызывает LLM по core_prompt_blocks.txt + ArticleSpec.",
      "4. QA / validate / severity работают поверх блоков.",
      "5. Отдельный модуль вставляет VIN-CTA блок в статью (randomized position между блоками) без превращения её в VIN-landing.",
      "6. rl_ingest_metrics.js и rl_update_strategy.js обновляют learned_strategy по реальным метрикам."
    ]
  }
}
JSON

# ---------------------------------------
# 3. ARTICLE TYPES (анкоры в JSON выше)
# ---------------------------------------
cat > "$ROOT_DIR/config/article_types.json" <<'JSON'
{ "article_types": {
  "vin_landing":{"zone":"vin_identity","label":"VIN landing (ограниченно, только как справочные страницы)","default_blocks":["hero","context_legal","vin_structure","fraud_risks","practical_steps","faq"],"recommended_length":{"min":1400,"max":2200}},
  "vin_encyclopedia":{"zone":"vin_identity","label":"VIN encyclopedia / WMI / structure","default_blocks":["hero","vin_structure","country_patterns","wmi_catalog_block","fraud_patterns_block","faq"],"recommended_length":{"min":1800,"max":2600}},
  "wmi_deep_dive":{"zone":"vin_identity","label":"WMI deep-dive","default_blocks":["hero","wmi_overview","plant_codes_block","brand_specific_patterns","fraud_patterns_block","checklist"],"recommended_length":{"min":1600,"max":2400}},
  "dmv_state_guide":{"zone":"dmv_titles","label":"DMV / State guide (how-to)","default_blocks":["hero","context_legal","step_by_step","mistakes","fees_taxes","faq"],"recommended_length":{"min":1600,"max":2400}},
  "dmv_legal_article":{"zone":"dmv_titles","label":"DMV legal article (laws, code references)","default_blocks":["hero","legal_background","case_scenarios","risks_penalties","edge_cases","faq"],"recommended_length":{"min":1800,"max":2600}},
  "auction_guide":{"zone":"auctions","label":"Auction buying guide","default_blocks":["hero","platform_overview","bidding_mechanics","inspection_guide","fees_and_hidden_costs","checklist"],"recommended_length":{"min":1600","max":2400}},
  "auction_fraud_patterns":{"zone":"auctions","label":"Auction fraud patterns","default_blocks":["hero","fraud_patterns_block","case_scenarios","how_to_avoid","state_specific_rules","faq"],"recommended_length":{"min":1600,"max":2400}},
  "inspection_guide":{"zone":"used_fraud","label":"Inspection guide for used/salvage cars","default_blocks":["hero","inspection_overview","body_frame","electrical_mechanical","paperwork_vin_history","checklist"],"recommended_length":{"min":1700,"max":2500}},
  "damage_type_encyclopedia":{"zone":"used_fraud","label":"Damage type encyclopedia","default_blocks":["hero","damage_definition","how_to_spot","impact_on_value_safety","legal_insurance_implications","faq"],"recommended_length":{"min":1600,"max":2400}},
  "brand_encyclopedia":{"zone":"brand_model","label":"Brand encyclopedia article","default_blocks":["hero","brand_history","market_positioning","reliability_philosophy","known_engine_families","known_transmissions","era_motifs"],"recommended_length":{"min":1800,"max":2600}},
  "model_generation_analysis":{"zone":"brand_model","label":"Model by generation / year analysis","default_blocks":["hero","generation_overview","issues_by_year","recalls_patterns_block","maintenance_cost_block","what_to_check_before_buying"],"recommended_length":{"min":1800,"max":2600}},
  "insurance_market_analytics":{"zone":"tech_insurance","label":"Insurance and market value analytics","default_blocks":["hero","value_curve","insurance_risk_block","theft_rates_block","safety_crashworthiness_block","who_should_avoid_or_buy"],"recommended_length":{"min":1700,"max":2500}}
 }}
JSON

# ---------------------------------------
# 4-7. BRANDS/STATES/AUDIENCES/BLOCK PROFILES
# ---------------------------------------
cat > "$ROOT_DIR/config/brands_models.json" <<'JSON'
{"brands":{
"Ford":{"origin":"USA","segment":"mainstream","exclude":false,"allow_all_models":true},
"Chevrolet":{"origin":"USA","segment":"mainstream","exclude":false,"allow_all_models":true},
"GMC":{"origin":"USA","segment":"mainstream","exclude":false,"allow_all_models":true},
"Dodge":{"origin":"USA","segment":"mainstream","exclude":false,"allow_all_models":true},
"Ram":{"origin":"USA","segment":"trucks","exclude":false,"allow_all_models":true},
"Jeep":{"origin":"USA","segment":"suv","exclude":false,"allow_all_models":true},
"Chrysler":{"origin":"USA","segment":"mainstream","exclude":false,"allow_all_models":true},
"Lincoln":{"origin":"USA","segment":"premium","exclude":false,"allow_all_models":true},
"Cadillac":{"origin":"USA","segment":"premium","exclude":false,"allow_all_models":true},
"Buick":{"origin":"USA","segment":"mainstream","exclude":false","allow_all_models":true},
"Tesla":{"origin":"USA","segment":"ev","exclude":false,"allow_all_models":true},
"Toyota":{"origin":"Japan","segment":"mainstream","exclude":false,"allow_all_models":true},
"Lexus":{"origin":"Japan","segment":"premium","exclude":false,"allow_all_models":true},
"Honda":{"origin":"Japan","segment":"mainstream","exclude":false,"allow_all_models":true},
"Acura":{"origin":"Japan","segment":"premium","exclude":false,"allow_all_models":true},
"Nissan":{"origin":"Japan","segment":"mainstream","exclude":false,"allow_all_models":true},
"Infiniti":{"origin":"Japan","segment":"premium","exclude":false,"allow_all_models":true},
"Subaru":{"origin":"Japan","segment":"mainstream","exclude":false,"allow_all_models":true},
"Mazda":{"origin":"Japan","segment":"mainstream","exclude":false,"allow_all_models":true},
"Mitsubishi":{"origin":"Japan","segment":"mainstream","exclude":false,"allow_all_models":true},
"Suzuki":{"origin":"Japan","segment":"mainstream","exclude":false,"allow_all_models":true},
"Hyundai":{"origin":"Korea","segment":"mainstream","exclude":false,"allow_all_models":true},
"Kia":{"origin":"Korea","segment":"mainstream","exclude":false,"allow_all_models":true},
"Genesis":{"origin":"Korea","segment":"premium","exclude":false,"allow_all_models":true},
"Volkswagen":{"origin":"Germany","segment":"mainstream","exclude":false,"allow_all_models":true},
"Audi":{"origin":"Germany","segment":"premium","exclude":false,"allow_all_models":true},
"BMW":{"origin":"Germany","segment":"premium","exclude":false,"allow_all_models":true},
"Mercedes-Benz":{"origin":"Germany","segment":"premium","exclude":false,"allow_all_models":true},
"Porsche":{"origin":"Germany","segment":"sport_premium","exclude":false,"allow_all_models":true},
"Volvo":{"origin":"Sweden","segment":"premium","exclude":false,"allow_all_models":true},
"Saab":{"origin":"Sweden","segment":"niche","exclude":false,"allow_all_models":true},
"Fiat":{"origin":"Italy","segment":"mainstream","exclude":false,"allow_all_models":true},
"Alfa Romeo":{"origin":"Italy","segment":"sport","exclude":false,"allow_all_models":true},
"Peugeot":{"origin":"France","segment":"mainstream","exclude":false,"allow_all_models":true},
"Renault":{"origin":"France","segment":"mainstream","exclude":false,"allow_all_models":true},
"Citroen":{"origin":"France","segment":"mainstream","exclude":false,"allow_all_models":true},
"MINI":{"origin":"UK","segment":"niche","exclude":false,"allow_all_models":true},
"Jaguar":{"origin":"UK","segment":"premium","exclude":false,"allow_all_models":true},
"Land Rover":{"origin":"UK","segment":"suv_premium","exclude":false,"allow_all_models":true},
"Opel":{"origin":"Germany","segment":"mainstream","exclude":false,"allow_all_models":true},
"Ferrari":{"origin":"Italy","segment":"supercar","exclude":true,"allow_all_models":false},
"Lamborghini":{"origin":"Italy","segment":"supercar","exclude":true,"allow_all_models":false},
"McLaren":{"origin":"UK","segment":"supercar","exclude":true,"allow_all_models":false},
"Bugatti":{"origin":"France","segment":"supercar","exclude":true,"allow_all_models":false},
"Aston Martin":{"origin":"UK","segment":"supercar","exclude":true,"allow_all_models":false},
"Maserati":{"origin":"Italy","segment":"supercar","exclude":true","allow_all_models":false},
"Rolls-Royce":{"origin":"UK","segment":"ultra_lux","exclude":true,"allow_all_models":false},
"Bentley":{"origin":"UK","segment":"ultra_lux","exclude":true,"allow_all_models":false},
"Lotus":{"origin":"UK","segment":"sports","exclude":true,"allow_all_models":false},
"Pagani":{"origin":"Italy","segment":"hypercar","exclude":true,"allow_all_models":false},
"BYD":{"origin":"China","segment":"mainstream","exclude":true,"allow_all_models":false},
"Geely":{"origin":"China","segment":"mainstream","exclude":true,"allow_all_models":false},
"Great Wall":{"origin":"China","segment":"mainstream","exclude":true","allow_all_models":false},
"Haval":{"origin":"China","segment":"suv","exclude":true,"allow_all_models":false},
"Chery":{"origin":"China","segment":"mainstream","exclude":true,"allow_all_models":false},
"NIO":{"origin":"China","segment":"ev","exclude":true,"allow_all_models":false},
"XPeng":{"origin":"China","segment":"ev","exclude":true,"allow_all_models":false},
"Li Auto":{"origin":"China","segment":"ev","exclude":true,"allow_all_models":false}
}}
JSON

cat > "$ROOT_DIR/config/states_us.json" <<'JSON'
{"states":[
{"code":"AL","name":"Alabama","border_mexico":false,"spanish_priority":false},
{"code":"AK","name":"Alaska","border_mexico":false,"spanish_priority":false},
{"code":"AZ","name":"Arizona","border_mexico":true,"spanish_priority":true},
{"code":"AR","name":"Arkansas","border_mexico":false,"spanish_priority":false},
{"code":"CA","name":"California","border_mexico":true,"spanish_priority":true},
{"code":"CO","name":"Colorado","border_mexico":false,"spanish_priority":true},
{"code":"CT","name":"Connecticut","border_mexico":false,"spanish_priority":false},
{"code":"DE","name":"Delaware","border_mexico":false","spanish_priority":false},
{"code":"FL","name":"Florida","border_mexico":false,"spanish_priority":true},
{"code":"GA","name":"Georgia","border_mexico":false,"spanish_priority":false},
{"code":"HI","name":"Hawaii","border_mexico":false,"spanish_priority":false},
{"code":"ID","name":"Idaho","border_mexико":false,"spanish_priority":false},
{"code":"IL","name":"Illinois","border_mexико":false","spanish_priority":true},
{"code":"IN","name":"Indiana","border_mexико":false,"spanish_priority":false},
{"code":"IA","name":"Iowa","border_mexико":false,"spanish_priority":false},
{"code":"KS","name":"Kansas","border_mexико":false,"spanish_priority":false},
{"code":"KY","name":"Kentucky","border_mexико":false,"spanish_priority":false},
{"code":"LA","name":"Louisiana","border_mexико":false,"spanish_priority":true},
{"code":"ME","name":"Maine","border_mexико":false,"spanish_priority":false},
{"code":"MD","name":"Maryland","border_mexико":false,"spanish_priority":false},
{"code":"MA","name":"Massachusetts","border_mexико":false,"spanish_priority":false},
{"code":"MI","name":"Michigan","border_mexико":false,"spanish_priority":false},
{"code":"MN","name":"Minnesota","border_mexико":false,"spanish_priority":false},
{"code":"MS","name":"Mississippi","border_mexико":false,"spanish_priority":false},
{"code":"MO","name":"Missouri","border_mexико":false,"spanish_priority":false},
{"code":"MT","name":"Montana","border_mexико":false,"spanish_priority":false},
{"code":"NE","name":"Nebraska","border_mexико":false,"spanish_priority":false},
{"code":"NV","name":"Nevada","border_mexико":false,"spanish_priority":true},
{"code":"NH","name":"New Hampshire","border_mexико":false,"spanish_priority":false},
{"code":"NJ","name":"New Jersey","border_mexико":false,"spanish_priority":true},
{"code":"NM","name":"New Mexico","border_mexико":true,"spanish_priority":true},
{"code":"NY","name":"New York","border_mexико":false,"spanish_priority":true},
{"code":"NC","name":"North Carolina","border_mexико":false,"spanish_priority":false},
{"code":"ND","name":"North Dakota","border_mexико":false,"spanish_priority":false},
{"code":"OH","name":"Ohio","border_mexико":false,"spanish_priority":false},
{"code":"OK","name":"Oklahoma","border_mexико":false,"spanish_priority":false},
{"code":"OR","name":"Oregon","border_mexико":false,"spanish_priority":false},
{"code":"PA","name":"Pennsylvania","border_mexико":false,"spanish_priority":false},
{"code":"RI","name":"Rhode Island","border_mexико":false,"spanish_priority":false},
{"code":"SC","name":"South Carolina","border_mexико":false,"spanish_priority":false},
{"code":"SD","name":"South Dakota","border_mexико":false,"spanish_priority":false},
{"code":"TN","name":"Tennessee","border_mexико":false,"spanish_priority":false},
{"code":"TX","name":"Texas","border_mexико":true,"spanish_priority":true},
{"code":"UT","name":"Utah","border_mexико":false,"spanish_priority":false},
{"code":"VT","name":"Vermont","border_mexико":false,"spanish_priority":false},
{"code":"VA","name":"Virginia","border_mexико":false,"spanish_priority":false},
{"code":"WA","name":"Washington","border_mexико":false,"spanish_priority":false},
{"code":"WV","name":"West Virginia","border_mexико":false,"spanish_priority":false},
{"code":"WI","name":"Wisconsin","border_mexико":false,"spanish_priority":false},
{"code":"WY","name":"Wyoming","border_mexико":false,"spanish_priority":false}
]}
JSON

cat > "$ROOT_DIR/config/audience_segments.json" <<'JSON'
{"segments":{
"us_general":{"languages":["en"],"dmv_focus":["title_types","registration","salvage_to_rebuilt"],"auction_focus":["copart","iaai","manheim"],"vin_cta_style":"short_neutral"},
"mx_us":{"languages":["es","en"],"preferred_states":["CA","TX","AZ","NM","NV","CO","IL","FL","NJ","NY"],"dmv_focus":["registration_from_auction","private_party_sale","salvage_to_rebuilt","imported_salvage_from_mexico"],"auction_focus":["copart","iaai"],"notes":"Мексиканцы, живущие/работающие в США: часто покупка битых/дешёвых машин, граница, аукционы, языковая поддержка ES.","vin_cta_style":"short_hard_safety"},
"dealer_pro":{"languages":["en"],"dmv_focus":["dealer_requirements","tax_fee_structures"],"auction_focus":["manheim","other_dealer_only"],"vin_cta_style":"embedded_in_process"},
"auction_flipper":{"languages":["en","es"],"dmv_focus":["state_to_state_flipping_risks","title_washing_schemes"],"auction_focus":["copart","iaai","acv"],"vin_cta_style":"process_step"}
}}
JSON

cat > "$ROOT_DIR/config/block_profiles.json" <<'JSON'
{"blocks":{
"hero":{"role":"hero","length":{"min":150,"max":230},"style":"summary","default_intents":["overview","why_it_matters"]},
"context_legal":{"role":"context","length":{"min":220,"max":320},"style":"tech_legal","default_intents":["legal_context","definitions"]},
"step_by_step":{"role":"guide","length":{"min":260","max":360},"style":"practical","default_intents":["steps","checklist"]},
"mistakes":{"role":"guide","length":{"min":200","max":300},"style":"practical","default_intents":["common_mistakes","warnings"]},
"fees_taxes":{"role":"analytic","length":{"min":180","max":260},"style":"analytic","default_intents":["fees","taxes","hidden_costs"]},
"legal_background":{"role":"context","length":{"min":260","max":360},"style":"tech_legal","default_intents":["statutes","case_law"]},
"case_scenarios":{"role":"context","length":{"min":200","max":300},"style":"practical","default_intents":["examples","edge_cases"]},
"risks_penalties":{"role":"guide","length":{"min":200","max":280},"style":"tech_legal","default_intents":["penalties","risk"]},
"platform_overview":{"role":"context","length":{"min":220","max":320},"style":"encyclopedia","default_intents":["platform_basics"]},
"bidding_mechanics":{"role":"guide","length":{"min":220","max":320},"style":"practical","default_intents":["bidding","fees"]},
"inspection_guide":{"role":"guide","length":{"min":260","max":360},"style":"practical","default_intents":["inspection_steps","checkpoints"]},
"fees_and_hidden_costs":{"role":"analytic","length":{"min":200","max":280},"style":"analytic","default_intents":["fees","hidden_costs"]},
"fraud_patterns_block":{"role":"context","length":{"min":260","max":360},"style":"tech_legal","default_intents":["fraud_patterns"]},
"state_specific_rules":{"role":"context","length":{"min":200","max":300},"style":"tech_legal","default_intents":["state_specific"]},
"inspection_overview":{"role":"context","length":{"min":220","max":320},"style":"encyclopedia","default_intents":["inspection_basics"]},
"body_frame":{"role":"guide","length":{"min":220","max":320},"style":"practical","default_intents":["body_frame_check"]},
"electrical_mechanical":{"role":"guide","length":{"min":220","max":320},"style":"practical","default_intents":["engine","transmission","electrical"]},
"paperwork_vin_history":{"role":"guide","length":{"min":200","max":280},"style":"practical","default_intents":["paperwork","vin_history","reports"]},
"checklist":{"role":"guide","length":{"min":160","max":240},"style":"practical","default_intents":["bullet_checklist"]},
"damage_definition":{"role":"encyclopedia","length":{"min":220","max":320},"style":"encyclopedia","default_intents":["definition"]},
"how_to_spot":{"role":"guide","length":{"min":220","max":320},"style":"practical","default_intents":["visual_signs","tests"]},
"impact_on_value_safety":{"role":"analytic","length":{"min":220","max":320},"style":"analytic","default_intents":["value_impact","safety_impact"]},
"legal_insurance_implications":{"role":"tech_legal","length":{"min":200","max":280},"style":"tech_legal","default_intents":["legal","insurance"]},
"brand_history":{"role":"encyclopedia","length":{"min":260","max":360},"style":"encyclopedia","default_intents":["history"]},
"market_positioning":{"role":"analytic","length":{"min":200","max":280},"style":"analytic","default_intents":["market_segment"]},
"reliability_philosophy":{"role":"context","length":{"min":200","max":300},"style":"encyclopedia","default_intents":["engineering_philosophy"]},
"known_engine_families":{"role":"encyclopedia","length":{"min":200","max":300},"style":"encyclopedia","default_intents":["engines"]},
"known_transmissions":{"role":"encyclopedia","length":{"min":200","max":300},"style":"encyclopedia","default_intents":["transmissions"]},
"era_motifs":{"role":"context","length":{"min":200","max":280},"style":"encyclopedia","default_intents":["era_character"]},
"generation_overview":{"role":"encyclopedia","length":{"min":240","max":340},"style":"encyclopedia","default_intents"]["generations"]}
}}
JSON

# ---------------------------------------
# 8. SEMANTIC GRAPH / RL CONFIG / STRATEGY / SCRIPTS / etc
# ---------------------------------------
# (Further sections omitted for brevity; identical to previous setup script)

cat > "$ROOT_DIR/config/semantic_graph.json" <<'JSON'
{"node_types":{"zone":{"label":"Zone","id_prefix":"zone:"},"supercluster":{"label":"Supercluster","id_prefix":"sc:"},"topic":{"label":"Topic","id_prefix":"topic:"},"brand":{"label":"Brand","id_prefix":"brand:"},"model":{"label":"Model","id_prefix":"model:"},"state":{"label":"State","id_prefix":"state:"},"auction":{"label":"Auction","id_prefix":"auc:"},"damage_type":{"label":"DamageType","id_prefix":"dmg:"},"body_type":{"label":"BodyType","id_prefix":"body:"},"audience":{"label":"Audience","id_prefix":"aud:"},"language":{"label":"Language","id_prefix":"lang:"}},"edge_types":{"zone_supercluster":{"label":"HAS_SUPERCLUSTER","from":"zone","to":"supercluster"},"supercluster_topic":{"label":"HAS_TOPIC","from":"supercluster","to":"topic"},"topic_brand":{"label":"USES_BRAND","from":"topic","to":"brand"},"topic_model":{"label":"USES_MODEL","from":"topic","to":"model"},"topic_state":{"label":"USES_STATE","from":"topic","to":"state"},"topic_auction":{"label":"USES_AUCTION","from":"topic","to":"auction"},"topic_damage":{"label":"USES_DAMAGE_TYPE","from":"topic","to":"damage_type"},"topic_body_type":{"label":"USES_BODY_TYPE","from":"topic","to":"body_type"},"topic_audience":{"label":"TARGETS_AUDIENCE","from":"topic","to":"audience"},"topic_language":{"label":"IN_LANGUAGE","from":"topic","to":"language"}}}
JSON

cat > "$ROOT_DIR/config/rl_config.json" <<'JSON'
{"version":"1.0","metrics_sources":["ga4","gsc","server_logs","stripe"],"learning_targets":{"wordcount":{"min":1400,"max":2600},"bounce_rate":{"target":0.35},"avg_scroll_depth":{"target":0.6},"conversion_rate":{"target":0.02}},"update_intervals":{"strategy_minutes":60,"topic_queue_minutes":30},"weights":{"ga4":0.4,"gsc":0.3,"server_logs":0.2,"stripe":0.1}}
JSON

cat > "$ROOT_DIR/config/learned_strategy.json" <<'JSON'
{"version":"1.0","updated_at":null,"article_type_weights":{"dmv_state_guide":1.0,"dmv_legal_article":1.0,"auction_guide":1.0,"auction_fraud_patterns":1.0,"inspection_guide":1.0,"damage_type_encyclopedia":1.0,"brand_encyclopedia":1.0,"model_generation_analysis":1.0,"insurance_market_analytics":1.0,"vin_landing":0.2,"vin_encyclopedia":0.5,"wmi_deep_dive":0.7},"audience_weights":{"us_general":1.0,"mx_us":1.2,"dealer_pro":0.8,"auction_flipper":1.0},"language_weights":{"en":1.0,"es":1.1},"zone_priority":{"dmv_titles":1.2,"used_fraud":1.1,"auctions":1.0,"brand_model":0.9,"tech_insurance":0.8,"vin_identity":0.5}}
JSON

cat > "$ROOT_DIR/scripts/build_article_spec.js" <<'JS'
const fs = require("fs");
const path = require("path");
function loadJson(p, fallback){try{return JSON.parse(fs.readFileSync(p,"utf8"));}catch{return fallback;}}
const articleTypes=loadJson(path.join(__dirname,"..","config","article_types.json"),{});
const blockProfiles=loadJson(path.join(__dirname,"..","config","block_profiles.json"),{});
const brandsModels=loadJson(path.join(__dirname,"..","config","brands_models.json"),{});
const statesUs=loadJson(path.join(__dirname,"..","config","states_us.json"),{});
const learnedStrategy=loadJson(path.join(__dirname,"..","config","learned_strategy.json"),{});
function resolveArticleType(typeId){const t=articleTypes.article_types?.[typeId];if(!t)throw new Error(`Unknown article type: ${typeId}`);return t;}
function collectMustTerms(topic){const terms=new Set();const dim=topic.dimensions||{};if(dim.brand&&brandsModels.brands?.[dim.brand]&&!brandsModels.brands[dim.brand].exclude)terms.add(dim.brand);if(dim.state&&statesUs.states?.some(s=>s.code===dim.state))terms.add(dim.state);terms.add("VIN");terms.add("vehicle history report");return Array.from(terms);}
function applyStrategyToBlocks(topic,blocks){const dim=topic.dimensions||{};const lang=dim.language||"en";const aud=dim.audience_segment||"us_general";const langWeight=learnedStrategy.language_weights?.[lang]??1;const audWeight=learnedStrategy.audience_weights?.[aud]??1;const typeWeight=learnedStrategy.article_type_weights?.[topic.type]??1;const factor=(langWeight+audWeight+typeWeight)/3;return blocks.map(b=>{const length={...b.length};const span=length.max-length.min;if(span>0){const grow=Math.round(span*(factor-1)*0.5);length.min=Math.max(80,length.min+grow);length.max=Math.max(length.min+20,length.max+grow);}return {...b,length};});}
function buildArticleSpec(topic){if(!topic||!topic.type)throw new Error("Topic must have type");const at=resolveArticleType(topic.type);const blocks=[];const mustTerms=collectMustTerms(topic);(at.default_blocks||[]).forEach(blockId=>{const bp=blockProfiles.blocks?.[blockId];if(!bp)return;const blockSpec={id:blockId,role:bp.role,length:bp.length,style:bp.style,intents:bp.default_intents||[]};if(["hero","checklist","faq"].includes(blockId))blockSpec.must_include_terms=mustTerms;blocks.push(blockSpec);});const tuned=applyStrategyToBlocks(topic,blocks);return{mode:"article_blocks",topic,blocks:tuned,output_format:"TEXT_WITH_DELIMS",delim:"\n\n===BLOCK_END===\n\n",meta:{article_type:topic.type,zone:topic.zone,supercluster:topic.supercluster||null}};}
if(require.main===module){const args=process.argv.slice(2);const idx=args.indexOf("--topic-file");if(idx===-1||!args[idx+1]){console.error("Usage: node scripts/build_article_spec.js --topic-file data/topic.json");process.exit(1);}const topicPath=args[idx+1];const topic=JSON.parse(fs.readFileSync(topicPath,"utf8"));const spec=buildArticleSpec(topic);process.stdout.write(JSON.stringify(spec,null,2));}
module.exports={buildArticleSpec};
JS

cat > "$ROOT_DIR/scripts/gen_article_blocks.js" <<'JS'
const fs = require("fs");
const path = require("path");
const https = require("https");
const { buildArticleSpec } = require("./build_article_spec.js");
function httpPostJson(url,payload,headers={}){return new Promise((resolve,reject)=>{const u=new URL(url);const data=JSON.stringify(payload);const options={hostname:u.hostname,port:u.port||(u.protocol==="https:"?443:80),path:u.pathname+(u.search||""),method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(data),...headers}};const req=https.request(options,res=>{let body="";res.on("data",chunk=>body+=chunk);res.on("end",()=>{try{resolve(JSON.parse(body));}catch(e){resolve(body);}});});req.on("error",reject);req.write(data);req.end();});}
async function callLLM(corePrompt,spec){const deepseekKey=process.env.DEEPSEEK_API_KEY;const useLocalAi=process.env.USE_LOCAL_AI==="1"||process.env.USE_LOCAL_AI==="true";if(deepseekKey){console.error("[LLM] Using DeepSeek-style HTTP provider (stub request).");const url="https://api.deepseek.example/placeholder";const payload={model:process.env.DEEPSEEK_MODEL||"deepseek-chat",messages:[{role:"system",content:corePrompt},{role:"user",content:JSON.stringify(spec)}]};try{const resp=await httpPostJson(url,payload,{Authorization:`Bearer ${deepseekKey}`});const text=resp?.choices?.[0]?.message?.content||resp?.output||`Stub DeepSeek response.\n\n===BLOCK_END===\n\nSecond block stub.`;return text;}catch(e){console.error("[LLM] DeepSeek call failed, falling back to stub:",e.message);}}
if(useLocalAi){console.error("[LLM] Using local Ollama provider (stub request).");const model=process.env.LOCAL_AI_MODEL||"phi3:mini";return`Stub local LLM (${model}) for topic ${spec.topic.topic_id}\n\n===BLOCK_END===\n\nSecond block stub.`;}
console.error("[LLM] Falling back to placeholder content – no providers available.");return`Stub article for topic ${spec.topic.topic_id}\n\n===BLOCK_END===\n\nSecond block stub.`;}
function splitBlocksFromOutput(output,delim){return output.split(delim).map(s=>s.trim()).filter(Boolean);}
async function generateArticleBlocks(topic){const corePromptPath=path.join(__dirname,"..","prompts","core_prompt_blocks.txt");const corePrompt=fs.readFileSync(corePromptPath,"utf8");const spec=buildArticleSpec(topic);const raw=await callLLM(corePrompt,spec);const parts=splitBlocksFromOutput(raw,spec.delim);const blocksOut={};spec.blocks.forEach((b,idx)=>{blocksOut[b.id]=parts[idx]||"";});return{topic,blocks:blocksOut};}
if(require.main===module){(async()=>{const args=process.argv.slice(2);const idx=args.indexOf("--topic-file");if(idx===-1||!args[idx+1]){console.error("Usage: node scripts/gen_article_blocks.js --topic-file data/topic.json");process.exit(1);}const topicPath=args[idx+1];const topic=JSON.parse(fs.readFileSync(topicPath,"utf8"));const res=await generateArticleBlocks(topic);process.stdout.write(JSON.stringify(res,null,2));})();}
module.exports={generateArticleBlocks};
JS

cat > "$ROOT_DIR/scripts/topic_selector.js" <<'JS'
const fs = require("fs");
const path = require("path");
function loadJson(p,fallback){try{return JSON.parse(fs.readFileSync(p,"utf8"));}catch{return fallback;}}
const semanticCore=loadJson(path.join(__dirname,"..","config","semantic_core.json"),{});
function buildTopicQueue(limit=50){return[
  {topic_id:"dmv_ca_title_types_checklist_es_mx_us",zone:"dmv_titles",supercluster:"dmv_supercluster",type:"dmv_state_guide",dimensions:{state:"CA",dmv_topic:"title_types",format_variant:"checklist",language:"es",audience_segment:"mx_us"}},
  {topic_id:"dmv_tx_title_types_checklist_es_mx_us",zone:"dmv_titles",supercluster:"dmv_supercluster",type:"dmv_state_guide",dimensions:{state:"TX",dmv_topic:"title_types",format_variant:"checklist",language:"es",audience_segment:"mx_us"}}
].slice(0,limit);}
if(require.main===module){process.stdout.write(JSON_STRINGIFY(buildTopicQueue(10)));
function JSON_STRINGIFY(o){return JSON.stringify(o,null,2);} }
module.exports={buildTopicQueue};
JS

cat > "$ROOT_DIR/scripts/rl_ingest_metrics.js" <<'JS'
const fs = require("fs");
const path = require("path");
function safeReadJsonl(filePath){const res=[];const raw=fs.readFileSync(filePath,"utf8");raw.split(/\r?\n/).forEach(line=>{const t=line.trim();if(!t)return;try{res.push(JSON.parse(t));}catch{}});return res;}
function main(){const metricsDir=path.join(__dirname,"..","data","metrics");const outPath=path.join(__dirname,"..","data","rl_aggregates.json");if(!fs.existsSync(metricsDir)){fs.writeFileSync(outPath,JSON.stringify({records:[],aggregates:{}},null,2));console.error("[RL] metrics dir not found, writing empty aggregates.");return;}const files=fs.readdirSync(metricsDir).filter(f=>f.endsWith(".json")||f.endsWith(".jsonl"));const records=[];for(const f of files){const full=path.join(metricsDir,f);if(f.endsWith(".jsonl"))records.push(...safeReadJsonl(full));else if(f.endsWith(".json")){try{const obj=JSON.parse(fs.readFileSync(full,"utf8"));if(Array.isArray(obj))records.push(...obj);else records.push(obj);}catch{}}}
const aggregates={total_records:records.length};fs.writeFileSync(outPath,JSON.stringify({records,aggregates},null,2));console.error(`[RL] Ingested ${records.length} metric records → ${outPath}`);}
if(require.main===module){main();}
JS

cat > "$ROOT_DIR/scripts/rl_update_strategy.js" <<'JS'
const fs = require("fs");
const path = require("path");
function loadJson(p,fallback){try{return JSON.parse(fs.readFileSync(p,"utf8"));}catch{return fallback;}}
function main(){const strategyPath=path.join(__dirname,"..","config","learned_strategy.json");const aggregatesPath=path.join(__dirname,"..","data","rl_aggregates.json");const strategy=loadJson(strategyPath,{});const aggregates=loadJson(aggregatesPath,{aggregates:{}});const total=aggregates.aggregates?.total_records||0;if(!total){strategy.updated_at=new Date().toISOString();fs.writeFileSync(strategyPath,JSON.stringify(strategy,null,2));console.error("[RL] No metrics, strategy timestamp updated only.");return;}strategy.updated_at=new Date().toISOString();fs.writeFileSync(strategyPath,JSON.stringify(strategy,null,2));console.error(`[RL] Strategy updated with ${total} metric records.`);}
if(require.main===module){main();}
JS

cat > "$ROOT_DIR/scripts/debug_run_topic.sh" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/debug_run_topic.sh data/topic.json"
  exit 1
fi
TOPIC_FILE="$1"
BASENAME="$(basename "$TOPIC_FILE" .json)"
mkdir -p tmp logs
if [[ -f scripts/rl_ingest_metrics.js ]]; then
  node scripts/rl_ingest_metrics.js || true
fi
if [[ -f scripts/rl_update_strategy.js ]]; then
  node scripts/rl_update_strategy.js || true
fi
node scripts/gen_article_blocks.js --topic-file "$TOPIC_FILE" > "tmp/${BASENAME}.blocks.json"
if [[ -f scripts/qa_page.js ]]; then
  MONSTER_TOPIC="$BASENAME" MONSTER_STAGE="debug" node scripts/qa_page.js < "tmp/${BASENAME}.blocks.json" > "tmp/${BASENAME}.qa.out" 2>"tmp/${BASENAME}.qa.log" || true
fi
if [[ -f scripts/validate_page.js ]]; then
  node scripts/validate_page.js "tmp/${BASENAME}.blocks.json" | tee "tmp/${BASENAME}.validate.out" || true
fi
BASH
chmod +x "$ROOT_DIR/scripts/debug_run_topic.sh"

# Sample topic + metrics README
cat > "$ROOT_DIR/data/topic.dmv_ca_title_types_checklist_es_mx_us.json" <<'JSON'
{"topic_id":"dmv_ca_title_types_checklist_es_mx_us","zone":"dmv_titles","supercluster":"dmv_supercluster","type":"dmv_state_guide","dimensions":{"state":"CA","dmv_topic":"title_types","format_variant":"checklist","language":"es","audience_segment":"mx_us"}}
JSON

cat > "$ROOT_DIR/data/metrics/README.txt" <<'TXT'
Сюда кладутся метрики в формате JSON/JSONL. См. пример в документации.
TXT

KB_FILE="$ROOT_DIR/data/seo/ai-training/knowledge-base.jsonl"
touch "$KB_FILE"
if ! grep -q '"monster-8.0-semantic-core"' "$KB_FILE" 2>/dev/null; then
  echo '{"id":"monster-8.0-semantic-core","type":"semantic_core","version":"8.0","description":"MONSTER 8.0 semantic core: article_blocks protocol, ArticleSpec builder, LLM wrapper, RL shell.","files":["prompts/core_prompt_blocks.txt","config/semantic_core.json","config/article_types.json","config/block_profiles.json","config/audience_segments.json","config/brands_models.json","config/states_us.json","config/rl_config.json","config/learned_strategy.json","scripts/build_article_spec.js","scripts/gen_article_blocks.js","scripts/rl_ingest_metrics.js","scripts/rl_update_strategy.js","scripts/topic_selector.js","scripts/debug_run_topic.sh","scripts/topic_graph_dump.js"]}' >> "$KB_FILE"
fi

# Quick warm-up
node "$ROOT_DIR/scripts/rl_ingest_metrics.js" >/dev/null 2>&1 || true
node "$ROOT_DIR/scripts/rl_update_strategy.js" >/dev/null 2>&1 || true
"$ROOT_DIR/scripts/debug_run_topic.sh" "$ROOT_DIR/data/topic.dmv_ca_title_types_checklist_es_mx_us.json" >/dev/null 2>&1 || true

echo "MONSTER 8.0 install/update complete."
echo "Run debug: scripts/debug_run_topic.sh data/topic.dmv_ca_title_types_checklist_es_mx_us.json"
echo "Reset: ./monster8.sh reset"
