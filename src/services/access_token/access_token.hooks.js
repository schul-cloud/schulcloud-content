const commonHooks = require('feathers-hooks-common');

module.exports = {
  before: {
    all: [],
    find: [commonHooks.disallow('external')], // TODO disallow find when rewritten to cookies
    get: [commonHooks.disallow('external')],
    create: [commonHooks.disallow('external')],
    update: [commonHooks.disallow()],
    patch: [commonHooks.disallow()],
    remove: [commonHooks.disallow('external')]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};