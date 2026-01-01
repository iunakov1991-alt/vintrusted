module.exports.applyNoindex = function (qualityIndex) {
  return qualityIndex < 0.25 ? "<meta name='robots' content='noindex'>" : "";
};























