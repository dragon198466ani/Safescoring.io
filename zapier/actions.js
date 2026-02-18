/**
 * SafeScoring Zapier Actions
 */

const API_BASE_URL = "https://safescoring.io";

// Action: Get Score
const getScore = {
  key: "get_score",
  noun: "Score",

  display: {
    label: "Get SafeScore",
    description: "Get the current SafeScore for a crypto product.",
  },

  operation: {
    inputFields: [
      {
        key: "product_slug",
        label: "Product Slug",
        type: "string",
        helpText: "The product slug (e.g., 'ledger-nano-x')",
        required: false,
      },
      {
        key: "product_name",
        label: "Product Name",
        type: "string",
        helpText: "Or search by product name (e.g., 'Ledger Nano X')",
        required: false,
      },
    ],

    perform: async (z, bundle) => {
      const response = await z.request({
        url: `${API_BASE_URL}/api/zapier/actions/get-score`,
        method: "POST",
        headers: {
          "X-API-Key": bundle.authData.api_key,
          "Content-Type": "application/json",
        },
        body: {
          product_slug: bundle.inputData.product_slug,
          product_name: bundle.inputData.product_name,
        },
      });

      if (response.status === 404) {
        throw new z.errors.Error("Product not found", "NotFoundError", 404);
      }

      return response.json;
    },

    sample: {
      product_slug: "ledger-nano-x",
      product_name: "Ledger Nano X",
      score: 85,
      security: 90,
      adversity: 80,
      fidelity: 85,
      efficiency: 85,
      type: "hardware-wallet",
      url: "https://safescoring.io/products/ledger-nano-x",
    },

    outputFields: [
      { key: "product_slug", label: "Product Slug" },
      { key: "product_name", label: "Product Name" },
      { key: "score", label: "SafeScore", type: "integer" },
      { key: "security", label: "Security Score", type: "integer" },
      { key: "adversity", label: "Adversity Score", type: "integer" },
      { key: "fidelity", label: "Fidelity Score", type: "integer" },
      { key: "efficiency", label: "Efficiency Score", type: "integer" },
      { key: "type", label: "Product Type" },
      { key: "url", label: "Product URL" },
    ],
  },
};

// Action: Compare Products
const compareProducts = {
  key: "compare_products",
  noun: "Comparison",

  display: {
    label: "Compare Products",
    description: "Compare two crypto products and get the winner.",
  },

  operation: {
    inputFields: [
      {
        key: "product1",
        label: "First Product",
        type: "string",
        helpText: "Slug or name of the first product",
        required: true,
      },
      {
        key: "product2",
        label: "Second Product",
        type: "string",
        helpText: "Slug or name of the second product",
        required: true,
      },
    ],

    perform: async (z, bundle) => {
      const response = await z.request({
        url: `${API_BASE_URL}/api/zapier/actions/compare`,
        method: "POST",
        headers: {
          "X-API-Key": bundle.authData.api_key,
          "Content-Type": "application/json",
        },
        body: {
          product1: bundle.inputData.product1,
          product2: bundle.inputData.product2,
        },
      });

      if (response.status === 404) {
        throw new z.errors.Error("One or both products not found", "NotFoundError", 404);
      }

      return response.json;
    },

    sample: {
      product1_slug: "ledger-nano-x",
      product1_name: "Ledger Nano X",
      product1_score: 85,
      product2_slug: "trezor-model-t",
      product2_name: "Trezor Model T",
      product2_score: 82,
      winner_slug: "ledger-nano-x",
      winner_name: "Ledger Nano X",
      score_difference: 3,
      comparison_url: "https://safescoring.io/compare/ledger-nano-x/trezor-model-t",
    },

    outputFields: [
      { key: "product1_slug", label: "Product 1 Slug" },
      { key: "product1_name", label: "Product 1 Name" },
      { key: "product1_score", label: "Product 1 Score", type: "integer" },
      { key: "product2_slug", label: "Product 2 Slug" },
      { key: "product2_name", label: "Product 2 Name" },
      { key: "product2_score", label: "Product 2 Score", type: "integer" },
      { key: "winner_slug", label: "Winner Slug" },
      { key: "winner_name", label: "Winner Name" },
      { key: "score_difference", label: "Score Difference", type: "integer" },
      { key: "comparison_url", label: "Comparison URL" },
    ],
  },
};

module.exports = {
  getScore,
  compareProducts,
};
