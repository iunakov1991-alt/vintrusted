module.exports.routeCrawl = function (url) {
  if (url.includes("/vin/") || url.includes("/vin-check/")) return "L1";
  if (url.includes("/dmv/") || url.includes("/fraud/") || url.includes("/auctions/")) return "L2";
  return "L3";
};
























