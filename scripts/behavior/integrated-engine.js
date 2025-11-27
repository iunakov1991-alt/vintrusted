const { logBehavior } = require("./behavior-logger");
const { dynamicCTA } = require("./dynamic-cta");
const { pickTemplate } = require("../a-b/ab-engine");
const { touchPageAge } = require("../page-quality/page-age");
const { routeCrawl } = require("../crawl-routing/crawl-router");

module.exports.runEngine = function(url) {
  logBehavior(url, { type: "visit" });
  touchPageAge(url);
  const cta = dynamicCTA();
  const template = pickTemplate();
  const crawl = routeCrawl(url);
  return { template, cta, crawl };
};

