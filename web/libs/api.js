import { toast } from "react-hot-toast";
import { signIn } from "next-auth/react";
import config from "@/config";

// use this to interact with our own API (/app/api folder) from the front-end side
// See https://shipfa.st/docs/tutorials/api-call

/**
 * A lightweight fetch wrapper that replaces the previous axios-based apiClient.
 * It preserves the same public API surface:
 *   - apiClient.get(url)    -> returns parsed JSON data directly
 *   - apiClient.post(url, data) -> returns parsed JSON data directly
 *   - apiClient.put(url, data)  -> returns parsed JSON data directly
 *   - apiClient.patch(url, data) -> returns parsed JSON data directly
 *   - apiClient.delete(url)     -> returns parsed JSON data directly
 *
 * Error handling mirrors the old axios interceptor:
 *   - 401 -> toast + redirect to sign-in
 *   - 403 -> toast "Pick a plan..."
 *   - Other errors -> toast the error message
 *   - All errors reject the promise so callers can catch them
 */

const BASE_URL = "/api";

async function handleResponse(res) {
  // Try to parse JSON body (may be empty for 204, etc.)
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok) {
    // Equivalent to the old interceptor returning response.data
    return data;
  }

  // --- Error handling (mirrors the old axios response interceptor) ---

  if (res.status === 401) {
    toast.error("Please login");
    // automatically redirect to /dashboard page after login
    return signIn(undefined, { callbackUrl: config.auth.callbackUrl });
  }

  let message = "";

  if (res.status === 403) {
    message = "Pick a plan to use this feature";
  } else {
    message = data?.error || res.statusText || "something went wrong...";
  }

  message = typeof message === "string" ? message : JSON.stringify(message);

  console.error(message);

  if (message) {
    toast.error(message);
  } else {
    toast.error("something went wrong...");
  }

  return Promise.reject(new Error(message));
}

async function request(method, url, body) {
  const fullUrl = `${BASE_URL}${url}`;

  const options = {
    method,
    headers: {},
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(fullUrl, options);
  return handleResponse(res);
}

const apiClient = {
  get: (url) => request("GET", url),
  post: (url, data) => request("POST", url, data),
  put: (url, data) => request("PUT", url, data),
  patch: (url, data) => request("PATCH", url, data),
  delete: (url) => request("DELETE", url),
};

export default apiClient;
