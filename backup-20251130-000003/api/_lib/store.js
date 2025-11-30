// Simple in-memory store for report status
const mem = new Map();

const store = {
  touch: (k, v) => mem.set(k, v),
  save: (k, v) => mem.set(k, v),
  get: (k) => mem.get(k)
};

module.exports = { store };

