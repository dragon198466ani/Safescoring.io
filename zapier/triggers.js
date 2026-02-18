/**
 * SafeScoring Zapier Triggers
 */

const API_BASE_URL = "https://safescoring.io";

// Trigger: Score Change
const scoreChange = {
  key: "score_change",
  noun: "Score Change",

  display: {
    label: "Score Change",
    description: "Triggers when a product's SafeScore changes significantly.",
    important: true,
  },

  operation: {
    inputFields: [
      {
        key: "product_slug",
        label: "Product (Optional)",
        type: "string",
        helpText: "Leave empty to monitor all products, or enter a specific product slug.",
        required: false,
      },
      {
        key: "threshold",
        label: "Minimum Change",
        type: "integer",
        default: "5",
        helpText: "Minimum score change to trigger (default: 5 points)",
        required: false,
      },
    ],

    perform: async (z, bundle) => {
      const response = await z.request({
        url: `${API_BASE_URL}/api/zapier/triggers/score-change`,
        method: "GET",
        headers: {
          "X-API-Key": bundle.authData.api_key,
        },
        params: {
          product_slug: bundle.inputData.product_slug,
          threshold: bundle.inputData.threshold || 5,
        },
      });

      return response.json;
    },

    sample: {
      id: "change_123",
      product_slug: "ledger-nano-x",
      product_name: "Ledger Nano X",
      old_score: 82,
      new_score: 78,
      change: -4,
      timestamp: "2024-01-15T10:30:00Z",
      url: "https://safescoring.io/products/ledger-nano-x",
    },

    outputFields: [
      { key: "id", label: "Change ID" },
      { key: "product_slug", label: "Product Slug" },
      { key: "product_name", label: "Product Name" },
      { key: "old_score", label: "Previous Score", type: "integer" },
      { key: "new_score", label: "New Score", type: "integer" },
      { key: "change", label: "Score Change", type: "integer" },
      { key: "timestamp", label: "Timestamp", type: "datetime" },
      { key: "url", label: "Product URL" },
    ],
  },
};

// Trigger: New Incident
const newIncident = {
  key: "new_incident",
  noun: "Security Incident",

  display: {
    label: "New Security Incident",
    description: "Triggers when a new security incident is reported.",
    important: true,
  },

  operation: {
    inputFields: [
      {
        key: "severity",
        label: "Minimum Severity",
        type: "string",
        choices: ["critical", "high", "medium", "low"],
        helpText: "Only trigger for incidents at or above this severity level.",
        required: false,
      },
      {
        key: "product_slug",
        label: "Product (Optional)",
        type: "string",
        helpText: "Filter incidents for a specific product.",
        required: false,
      },
    ],

    perform: async (z, bundle) => {
      const response = await z.request({
        url: `${API_BASE_URL}/api/zapier/triggers/new-incident`,
        method: "GET",
        headers: {
          "X-API-Key": bundle.authData.api_key,
        },
        params: {
          severity: bundle.inputData.severity,
          product_slug: bundle.inputData.product_slug,
        },
      });

      return response.json;
    },

    sample: {
      id: "incident_456",
      title: "Flash Loan Attack on DeFi Protocol",
      description: "Attacker exploited price oracle manipulation...",
      severity: "critical",
      product_slug: "sample-defi",
      product_name: "Sample DeFi",
      funds_lost: 5000000,
      date: "2024-01-15T08:00:00Z",
      source_url: "https://example.com/article",
      url: "https://safescoring.io/incidents",
    },

    outputFields: [
      { key: "id", label: "Incident ID" },
      { key: "title", label: "Title" },
      { key: "description", label: "Description" },
      { key: "severity", label: "Severity" },
      { key: "product_slug", label: "Product Slug" },
      { key: "product_name", label: "Product Name" },
      { key: "funds_lost", label: "Funds Lost ($)", type: "number" },
      { key: "date", label: "Date", type: "datetime" },
      { key: "source_url", label: "Source URL" },
      { key: "url", label: "SafeScoring URL" },
    ],
  },
};

// Trigger: Threshold Alert
const thresholdAlert = {
  key: "threshold_alert",
  noun: "Threshold Alert",

  display: {
    label: "Score Below Threshold",
    description: "Triggers when a product's score drops below your specified threshold.",
  },

  operation: {
    inputFields: [
      {
        key: "threshold",
        label: "Score Threshold",
        type: "integer",
        default: "50",
        helpText: "Alert when score drops below this value (0-100)",
        required: true,
      },
      {
        key: "product_slug",
        label: "Product (Optional)",
        type: "string",
        helpText: "Monitor a specific product or leave empty for all.",
        required: false,
      },
    ],

    perform: async (z, bundle) => {
      const response = await z.request({
        url: `${API_BASE_URL}/api/zapier/triggers/threshold-alert`,
        method: "GET",
        headers: {
          "X-API-Key": bundle.authData.api_key,
        },
        params: {
          threshold: bundle.inputData.threshold || 50,
          product_slug: bundle.inputData.product_slug,
        },
      });

      return response.json;
    },

    sample: {
      id: "alert_789",
      product_slug: "risky-protocol",
      product_name: "Risky Protocol",
      score: 42,
      threshold: 50,
      timestamp: "2024-01-15T12:00:00Z",
      url: "https://safescoring.io/products/risky-protocol",
    },

    outputFields: [
      { key: "id", label: "Alert ID" },
      { key: "product_slug", label: "Product Slug" },
      { key: "product_name", label: "Product Name" },
      { key: "score", label: "Current Score", type: "integer" },
      { key: "threshold", label: "Threshold", type: "integer" },
      { key: "timestamp", label: "Timestamp", type: "datetime" },
      { key: "url", label: "Product URL" },
    ],
  },
};

module.exports = {
  scoreChange,
  newIncident,
  thresholdAlert,
};
