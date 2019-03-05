//const authenticate = require('../../hooks/authenticate');
const commonHooks = require("feathers-hooks-common");
const defaultHooks = require("./file_default.hook.js");
const authenticate = require("../../hooks/authenticate");

const distributionHooks = {
  ...defaultHooks
};

const manageHooks = {
  ...defaultHooks,
  before: {
    all: [commonHooks.disallow("external")]
  }
};

const structureHooks = {
  ...defaultHooks,
  before: {
    get: [authenticate]
  }
};

const uploadHooks = {
  ...defaultHooks,
  before: {
    create: [authenticate]
  }
};

module.exports = {
  distribution: distributionHooks,
  manage: manageHooks,
  structure: structureHooks,
  upload: uploadHooks
};
