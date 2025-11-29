
const prefix = (tag) => `[SEO ${tag}]`;



function log(tag, msg) {

  const ts = new Date().toISOString();

  console.log(`${prefix(tag)} ${ts} - ${msg}`);

}



module.exports = { log };

