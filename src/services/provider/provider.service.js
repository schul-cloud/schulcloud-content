const createService = require('feathers-mongoose');
const createModel = require('../../models/provider.model');
const hooks = require('./provider.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    Model,
    paginate
  };

  // Initialize our service with any options it requires
  app.use('/provider', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('provider');

  service.hooks(hooks);
};