const fs = require('fs');
const path = require('path');

module.exports.killSwitch = function () {
  const killFile = path.join(__dirname, "..", "..", "config", "STOP_INDEXING");
  return fs.existsSync(killFile);
};



