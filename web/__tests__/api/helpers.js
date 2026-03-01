/**
 * API Test Helpers
 *
 * Shared utilities for testing Next.js API routes in isolation.
 * Provides mock builders for requests, responses, Supabase, and auth sessions.
 *
 * Usage:
 *   import { createMockRequest, mockSupabase, mockAuthSession } from "./helpers";
 */

import { vi } from "vitest";

// ---------------------------------------------------------------------------
// 1. Mock Request / Response builders
// ---------------------------------------------------------------------------

/**
 * Build a mock Next.js Request object (compatible with App Router route handlers).
 *
 * @param {object} options
 * @param {string}  [options.method="GET"]       - HTTP method
 * @param {string}  [options.url="http://localhost:3000"] - Full URL (including query string)
 * @param {object}  [options.headers={}]         - Key/value header pairs
 * @param {object}  [options.body=null]          - JSON body (auto-serialized)
 * @param {object}  [options.searchParams={}]    - Convenience for appending query params to url
 * @returns {Request}
 */
export function createMockRequest({
  method = "GET",
  url = "http://localhost:3000",
  headers = {},
  body = null,
  searchParams = {},
} = {}) {
  // Merge searchParams into url
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(searchParams)) {
    parsed.searchParams.set(key, String(value));
  }

  const init = {
    method,
    headers: new Headers(headers),
  };

  if (body && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(body);
    init.headers.set("content-type", "application/json");
  }

  // We create a plain object that behaves like the Next.js request
  const req = {
    method,
    url: parsed.toString(),
    headers: {
      get: (key) => init.headers.get(key),
      has: (key) => init.headers.has(key),
      entries: () => init.headers.entries(),
      forEach: (cb) => init.headers.forEach(cb),
    },
    json: async () => body,
    text: async () => (body ? JSON.stringify(body) : ""),
    nextUrl: parsed,
  };

  return req;
}

/**
 * Helper to parse a NextResponse returned by a route handler.
 *
 * @param {Response} response - NextResponse from route handler
 * @returns {Promise<{ status: number, headers: object, body: any }>}
 */
export async function parseResponse(response) {
  const status = response.status;
  const headers = {};
  if (response.headers?.forEach) {
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // response may not be JSON
    try {
      body = await response.text();
    } catch {
      body = null;
    }
  }

  return { status, headers, body };
}

// ---------------------------------------------------------------------------
// 2. Mock Supabase Client
// ---------------------------------------------------------------------------

/**
 * Create a chainable mock Supabase client.
 *
 * Every chainable method (from, select, eq, etc.) returns `this` so you can
 * configure the final resolution with `.mockResolvedData(data)` or let it
 * default to `{ data: [], error: null }`.
 *
 * @param {object} [defaults]
 * @param {any}    [defaults.data=[]]    - Default resolved data
 * @param {any}    [defaults.error=null] - Default resolved error
 * @param {number} [defaults.count=0]    - Default count value
 * @returns {object} Mock supabase client
 */
export function createMockSupabase({ data = [], error = null, count = 0 } = {}) {
  let _data = data;
  let _error = error;
  let _count = count;

  const chainable = {};

  const chainMethods = [
    "from",
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "in",
    "is",
    "not",
    "or",
    "filter",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
    "match",
    "textSearch",
  ];

  for (const method of chainMethods) {
    chainable[method] = vi.fn().mockImplementation(() => {
      // maybeSingle and single resolve immediately with the result
      if (method === "maybeSingle" || method === "single") {
        return Promise.resolve({
          data: Array.isArray(_data) ? _data[0] ?? null : _data,
          error: _error,
          count: _count,
        });
      }
      return chainable;
    });
  }

  // rpc resolves directly
  chainable.rpc = vi.fn().mockImplementation(() =>
    Promise.resolve({ data: _data, error: _error })
  );

  // The `then` method makes the chainable awaitable (thenable)
  chainable.then = (resolve) =>
    resolve({ data: _data, error: _error, count: _count });

  /**
   * Override resolved data for the next query chain.
   * Returns the chainable so you can keep building.
   */
  chainable.mockResolvedData = (newData, newError = null, newCount) => {
    _data = newData;
    _error = newError;
    if (newCount !== undefined) _count = newCount;
    return chainable;
  };

  return chainable;
}

// ---------------------------------------------------------------------------
// 3. Mock Auth Session
// ---------------------------------------------------------------------------

/**
 * Create a mock auth session object compatible with `auth()` from `@/libs/auth`.
 *
 * @param {object} [overrides]
 * @param {string}  [overrides.userId]     - User UUID
 * @param {string}  [overrides.email]      - User email
 * @param {boolean} [overrides.hasAccess]  - Whether user has paid access
 * @param {string}  [overrides.plan]       - Plan code (free, explorer, professional, enterprise)
 * @returns {object|null} Session object or null for unauthenticated
 */
export function createMockSession({
  userId = "test-user-00000000-0000-0000-0000-000000000001",
  email = "test@safescoring.io",
  hasAccess = false,
  plan = "free",
  ...extra
} = {}) {
  return {
    user: {
      id: userId,
      email,
      hasAccess,
      plan,
      ...extra,
    },
  };
}

/**
 * Return `null` — represents an unauthenticated session.
 */
export function createNullSession() {
  return null;
}

// ---------------------------------------------------------------------------
// 4. Common vi.mock factories
// ---------------------------------------------------------------------------

/**
 * Standard mock factory for `@/libs/supabase`.
 * Import this from helpers then pass to `vi.mock()`:
 *
 *   vi.mock("@/libs/supabase", () => supabaseMockFactory());
 *
 * The mock exposes `mockSupabaseData(data, error)` on the returned supabase
 * client so individual tests can override resolved data.
 */
export function supabaseMockFactory(initialData = [], initialError = null) {
  const mockClient = createMockSupabase({ data: initialData, error: initialError });

  return {
    supabase: mockClient,
    supabaseAdmin: mockClient,
    isSupabaseConfigured: vi.fn(() => true),
    getSupabase: vi.fn(() => mockClient),
    getSupabaseAdmin: vi.fn(() => mockClient),
    getSupabaseServer: vi.fn(() => mockClient),
    default: mockClient,
    __mockClient: mockClient, // escape hatch for tests
  };
}

/**
 * Standard mock factory for `@/libs/auth`.
 * By default returns an unauthenticated session.
 *
 *   vi.mock("@/libs/auth", () => authMockFactory());
 *
 * Override per-test:
 *   const { auth } = await import("@/libs/auth");
 *   auth.mockResolvedValueOnce(createMockSession({ hasAccess: true }));
 */
export function authMockFactory(defaultSession = null) {
  return {
    auth: vi.fn().mockResolvedValue(defaultSession),
  };
}

// ---------------------------------------------------------------------------
// 5. Assertion helpers
// ---------------------------------------------------------------------------

/**
 * Assert that a response is JSON with a given status code.
 */
export async function expectJsonStatus(response, expectedStatus) {
  const { status, body } = await parseResponse(response);
  if (status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${status}. Body: ${JSON.stringify(body)}`
    );
  }
  return body;
}

/**
 * Assert that a response body contains an error message.
 */
export async function expectError(response, expectedStatus, errorSubstring) {
  const body = await expectJsonStatus(response, expectedStatus);
  if (errorSubstring && (!body.error || !body.error.includes(errorSubstring))) {
    throw new Error(
      `Expected error containing "${errorSubstring}" but got: ${body.error}`
    );
  }
  return body;
}
