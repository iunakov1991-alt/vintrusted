const { computeQualityIndex } = require("./compute-quality-index");

module.exports.dynamicCTA = function () {
  const qi = computeQualityIndex();
  if (qi > 0.7) return "Check full VIN report instantly";
  if (qi > 0.4) return "See your vehicle history now";
  return "Run fast VIN lookup (free)";
};













