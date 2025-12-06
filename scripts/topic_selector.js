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
