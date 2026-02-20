/**
 * SafeScoring Zapier Integration
 *
 * This file defines the Zapier app configuration.
 * To publish to Zapier:
 * 1. Install Zapier CLI: npm install -g zapier-platform-cli
 * 2. Login: zapier login
 * 3. Register: zapier register "SafeScoring"
 * 4. Push: zapier push
 *
 * Documentation: https://platform.zapier.com/cli_docs/docs
 */

const authentication = require("./authentication");
const triggers = require("./triggers");
const actions = require("./actions");

module.exports = {
  version: require("./package.json").version,
  platformVersion: require("zapier-platform-core").version,

  authentication: authentication,

  triggers: {
    [triggers.scoreChange.key]: triggers.scoreChange,
    [triggers.newIncident.key]: triggers.newIncident,
    [triggers.thresholdAlert.key]: triggers.thresholdAlert,
  },

  actions: {
    [actions.getScore.key]: actions.getScore,
    [actions.compareProducts.key]: actions.compareProducts,
  },

  searches: {},

  // Hook for testing connection
  hydrators: {},
};
