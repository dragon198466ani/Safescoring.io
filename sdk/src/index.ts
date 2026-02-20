/**
 * SafeScoring SDK
 * Official TypeScript/JavaScript SDK for the SafeScoring API
 *
 * @example
 * ```typescript
 * import { SafeScoring } from '@safescoring/sdk';
 *
 * const client = new SafeScoring({ apiKey: 'sk_live_xxx' });
 * const product = await client.products.get('ledger-nano-x');
 * console.log(product.score); // 85
 * ```
 */

// Types
export interface SafeScoringConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  type: string;
  description?: string;
  website?: string;
  logo?: string;
  score: number;
  scores: {
    s: number; // Security
    a: number; // Adversity
    f: number; // Fidelity
    e: number; // Efficiency
  };
  lastUpdated: string;
  incidents?: Incident[];
  scoreHistory?: ScoreHistoryEntry[];
}

export interface ProductListItem {
  slug: string;
  name: string;
  type: string;
  score: number;
  logo?: string;
}

export interface ProductsResponse {
  products: ProductListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  date: string;
  fundsLost?: number;
  source?: string;
  productSlug?: string;
  productName?: string;
}

export interface IncidentsResponse {
  data: Incident[];
  total: number;
  page: number;
  limit: number;
}

export interface ScoreHistoryEntry {
  date: string;
  score: number;
  scores: {
    s: number;
    a: number;
    f: number;
    e: number;
  };
}

export interface Stats {
  totalProducts: number;
  avgScore: number;
  totalIncidents: number;
  byType: Record<string, number>;
}

export interface ProductType {
  slug: string;
  name: string;
  count: number;
}

export interface AlertSubscription {
  id: string;
  type: 'score_change' | 'new_incident' | 'threshold';
  productSlug?: string;
  threshold?: number;
  webhookUrl?: string;
  email?: string;
  isActive: boolean;
}

export interface CreateAlertParams {
  type: 'score_change' | 'new_incident' | 'threshold';
  productSlug?: string;
  threshold?: number;
  webhookUrl?: string;
  email?: string;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

// Error classes
export class SafeScoringError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'SafeScoringError';
  }
}

export class RateLimitError extends SafeScoringError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends SafeScoringError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 401, 'AUTHENTICATION_FAILED');
    this.name = 'AuthenticationError';
  }
}

// HTTP client
async function request<T>(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw new RateLimitError(
          errorBody.error || 'Rate limit exceeded',
          retryAfter
        );
      }

      if (response.status === 401) {
        throw new AuthenticationError(errorBody.error);
      }

      throw new SafeScoringError(
        errorBody.error || `HTTP ${response.status}`,
        response.status,
        errorBody.code
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof SafeScoringError) {
      throw error;
    }

    if ((error as Error).name === 'AbortError') {
      throw new SafeScoringError('Request timeout', 408, 'TIMEOUT');
    }

    throw new SafeScoringError(
      (error as Error).message || 'Network error',
      0,
      'NETWORK_ERROR'
    );
  }
}

// Products API
class ProductsAPI {
  constructor(
    private baseUrl: string,
    private headers: HeadersInit,
    private timeout: number
  ) {}

  /**
   * List all products with optional filtering
   */
  async list(params: {
    page?: number;
    limit?: number;
    type?: string;
    minScore?: number;
    maxScore?: number;
    sort?: 'score' | 'name' | 'updated';
    order?: 'asc' | 'desc';
  } = {}): Promise<ProductsResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.type) searchParams.set('type', params.type);
    if (params.minScore) searchParams.set('minScore', String(params.minScore));
    if (params.maxScore) searchParams.set('maxScore', String(params.maxScore));
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.order) searchParams.set('order', params.order);

    const query = searchParams.toString();
    const url = `${this.baseUrl}/api/v1/products${query ? `?${query}` : ''}`;

    return request<ProductsResponse>(url, {
      headers: this.headers,
      timeout: this.timeout,
    });
  }

  /**
   * Get a single product by slug
   */
  async get(slug: string, options: {
    includeHistory?: boolean;
    includeIncidents?: boolean;
  } = {}): Promise<Product> {
    const searchParams = new URLSearchParams();

    if (options.includeHistory) searchParams.set('history', 'true');
    if (options.includeIncidents) searchParams.set('incidents', 'true');

    const query = searchParams.toString();
    const url = `${this.baseUrl}/api/v1/products/${slug}${query ? `?${query}` : ''}`;

    return request<Product>(url, {
      headers: this.headers,
      timeout: this.timeout,
    });
  }

  /**
   * Search for products
   */
  async search(query: string, limit: number = 10): Promise<ProductListItem[]> {
    const url = `${this.baseUrl}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;

    const response = await request<{ results: ProductListItem[] }>(url, {
      headers: this.headers,
      timeout: this.timeout,
    });

    return response.results;
  }

  /**
   * Get score history for a product
   */
  async getHistory(slug: string, days: number = 30): Promise<ScoreHistoryEntry[]> {
    const url = `${this.baseUrl}/api/v1/products/${slug}?history=true&days=${days}`;

    const response = await request<Product>(url, {
      headers: this.headers,
      timeout: this.timeout,
    });

    return response.scoreHistory || [];
  }
}

// Incidents API
class IncidentsAPI {
  constructor(
    private baseUrl: string,
    private headers: HeadersInit,
    private timeout: number
  ) {}

  /**
   * List security incidents
   */
  async list(params: {
    page?: number;
    limit?: number;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    productSlug?: string;
  } = {}): Promise<IncidentsResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.severity) searchParams.set('severity', params.severity);
    if (params.productSlug) searchParams.set('product', params.productSlug);

    const query = searchParams.toString();
    const url = `${this.baseUrl}/api/v1/incidents${query ? `?${query}` : ''}`;

    return request<IncidentsResponse>(url, {
      headers: this.headers,
      timeout: this.timeout,
    });
  }

  /**
   * Get recent incidents
   */
  async recent(limit: number = 5): Promise<Incident[]> {
    const response = await this.list({ limit, page: 1 });
    return response.data;
  }
}

// Alerts API
class AlertsAPI {
  constructor(
    private baseUrl: string,
    private headers: HeadersInit,
    private timeout: number
  ) {}

  /**
   * List alert subscriptions
   */
  async list(): Promise<AlertSubscription[]> {
    const url = `${this.baseUrl}/api/v1/alerts`;

    const response = await request<{ alerts: AlertSubscription[] }>(url, {
      headers: this.headers,
      timeout: this.timeout,
    });

    return response.alerts;
  }

  /**
   * Create a new alert subscription
   */
  async create(params: CreateAlertParams): Promise<{
    id: string;
    webhookSecret?: string;
  }> {
    const url = `${this.baseUrl}/api/v1/alerts`;

    return request(url, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      timeout: this.timeout,
    });
  }

  /**
   * Delete an alert subscription
   */
  async delete(alertId: string): Promise<void> {
    const url = `${this.baseUrl}/api/v1/alerts?id=${alertId}`;

    await request(url, {
      method: 'DELETE',
      headers: this.headers,
      timeout: this.timeout,
    });
  }
}

// Stats API
class StatsAPI {
  constructor(
    private baseUrl: string,
    private headers: HeadersInit,
    private timeout: number
  ) {}

  /**
   * Get global statistics
   */
  async get(): Promise<Stats> {
    const url = `${this.baseUrl}/api/v1/stats`;

    return request<Stats>(url, {
      headers: this.headers,
      timeout: this.timeout,
    });
  }

  /**
   * Get product types
   */
  async getTypes(): Promise<ProductType[]> {
    const url = `${this.baseUrl}/api/v1/types`;

    const response = await request<{ types: ProductType[] }>(url, {
      headers: this.headers,
      timeout: this.timeout,
    });

    return response.types;
  }
}

// Webhook utilities
export class WebhookUtils {
  /**
   * Verify webhook signature
   */
  static async verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  }

  /**
   * Parse webhook payload
   */
  static parsePayload(body: string): WebhookPayload {
    return JSON.parse(body);
  }
}

// Main client
export class SafeScoring {
  public readonly products: ProductsAPI;
  public readonly incidents: IncidentsAPI;
  public readonly alerts: AlertsAPI;
  public readonly stats: StatsAPI;

  private baseUrl: string;
  private headers: HeadersInit;
  private timeout: number;

  constructor(config: SafeScoringConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://safescoring.io';
    this.timeout = config.timeout || 30000;

    this.headers = {
      'Accept': 'application/json',
      'User-Agent': '@safescoring/sdk/1.0.0',
    };

    if (config.apiKey) {
      this.headers = {
        ...this.headers,
        'X-API-Key': config.apiKey,
      };
    }

    // Initialize API modules
    this.products = new ProductsAPI(this.baseUrl, this.headers, this.timeout);
    this.incidents = new IncidentsAPI(this.baseUrl, this.headers, this.timeout);
    this.alerts = new AlertsAPI(this.baseUrl, this.headers, this.timeout);
    this.stats = new StatsAPI(this.baseUrl, this.headers, this.timeout);
  }

  /**
   * Quick method to get a product's score
   */
  async getScore(slug: string): Promise<number> {
    const product = await this.products.get(slug);
    return product.score;
  }

  /**
   * Quick method to compare two products
   */
  async compare(slug1: string, slug2: string): Promise<{
    product1: Product;
    product2: Product;
    winner: string;
    scoreDiff: number;
  }> {
    const [product1, product2] = await Promise.all([
      this.products.get(slug1),
      this.products.get(slug2),
    ]);

    const scoreDiff = Math.abs(product1.score - product2.score);
    const winner = product1.score >= product2.score ? product1.slug : product2.slug;

    return { product1, product2, winner, scoreDiff };
  }

  /**
   * Get leaderboard (top products by score)
   */
  async leaderboard(limit: number = 10, type?: string): Promise<ProductListItem[]> {
    const response = await this.products.list({
      limit,
      type,
      sort: 'score',
      order: 'desc',
    });

    return response.products;
  }
}

// Default export
export default SafeScoring;
