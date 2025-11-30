const prefix = (tag) => `[SEO ${tag}]`;

function log(tag, msg, data = null) {
  const ts = new Date().toISOString();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  console.log(`${prefix(tag)} ${ts} - ${msg}${dataStr}`);
}

function error(tag, msg, err = null) {
  const ts = new Date().toISOString();
  const errStr = err ? ` | Error: ${err.message || err}` : '';
  console.error(`${prefix(tag)} ${ts} - ERROR: ${msg}${errStr}`);
}

module.exports = { log, error };
