/**
 * SafeScoring Zapier Authentication
 *
 * Uses API Key authentication
 */

const API_BASE_URL = "https://safescoring.io";

const testAuth = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE_URL}/api/zapier/auth`,
    method: "GET",
    headers: {
      "X-API-Key": bundle.authData.api_key,
    },
  });

  if (response.status !== 200) {
    throw new z.errors.Error("Invalid API key", "AuthenticationError", response.status);
  }

  return response.json;
};

module.exports = {
  type: "custom",
  fields: [
    {
      key: "api_key",
      label: "API Key",
      type: "string",
      required: true,
      helpText: "Your SafeScoring API key. Get one at https://safescoring.io/dashboard/api",
    },
  ],
  test: testAuth,
  connectionLabel: (z, bundle) => {
    return bundle.inputData.email || "SafeScoring User";
  },
};
