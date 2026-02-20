/**
 * NowPayments Crypto Payment Integration
 * Supports: BTC, ETH, USDT, USDC, and 100+ cryptocurrencies
 *
 * Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
 */

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

/**
 * Get NowPayments API headers
 */
function getHeaders() {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('NOWPAYMENTS_API_KEY is not configured');
  }
  return {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
  };
}

/**
 * Check API status
 */
export async function getStatus() {
  const response = await fetch(`${NOWPAYMENTS_API_URL}/status`, {
    headers: getHeaders(),
  });
  return response.json();
}

/**
 * Get available currencies
 */
export async function getAvailableCurrencies() {
  const response = await fetch(`${NOWPAYMENTS_API_URL}/currencies`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  return data.currencies || [];
}

/**
 * Get minimum payment amount for a currency
 */
export async function getMinimumAmount(currencyFrom, currencyTo = 'usd') {
  const response = await fetch(
    `${NOWPAYMENTS_API_URL}/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`,
    { headers: getHeaders() }
  );
  return response.json();
}

/**
 * Get estimated price
 */
export async function getEstimatedPrice(amount, currencyFrom, currencyTo = 'usd') {
  const response = await fetch(
    `${NOWPAYMENTS_API_URL}/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`,
    { headers: getHeaders() }
  );
  return response.json();
}

/**
 * Create a payment
 * @param {Object} options Payment options
 * @param {number} options.priceAmount - Amount in fiat (e.g., 19 for $19)
 * @param {string} options.priceCurrency - Fiat currency (e.g., 'usd')
 * @param {string} options.payCurrency - Crypto currency to pay with (e.g., 'btc')
 * @param {string} options.orderId - Your internal order ID
 * @param {string} options.orderDescription - Description of the purchase
 * @param {string} options.ipnCallbackUrl - Webhook URL for payment notifications
 * @param {string} options.successUrl - Redirect URL on success
 * @param {string} options.cancelUrl - Redirect URL on cancel
 */
export async function createPayment({
  priceAmount,
  priceCurrency = 'usd',
  payCurrency = 'btc',
  orderId,
  orderDescription,
  ipnCallbackUrl,
  successUrl,
  cancelUrl,
}) {
  const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      price_amount: priceAmount,
      price_currency: priceCurrency,
      pay_currency: payCurrency,
      order_id: orderId,
      order_description: orderDescription,
      ipn_callback_url: ipnCallbackUrl,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create payment');
  }

  return response.json();
}

/**
 * Create an invoice (hosted checkout page)
 * Better UX - user selects crypto on NowPayments page
 */
export async function createInvoice({
  priceAmount,
  priceCurrency = 'usd',
  orderId,
  orderDescription,
  ipnCallbackUrl,
  successUrl,
  cancelUrl,
}) {
  const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      price_amount: priceAmount,
      price_currency: priceCurrency,
      order_id: orderId,
      order_description: orderDescription,
      ipn_callback_url: ipnCallbackUrl,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create invoice');
  }

  return response.json();
}

/**
 * Get payment status
 */
export async function getPaymentStatus(paymentId) {
  const response = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
    headers: getHeaders(),
  });
  return response.json();
}

/**
 * Verify IPN (Instant Payment Notification) signature
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyIPN(payload, signature) {
  const crypto = require('crypto');
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

  if (!ipnSecret) {
    throw new Error('NOWPAYMENTS_IPN_SECRET is not configured');
  }

  if (!signature || typeof signature !== 'string') {
    return false;
  }

  // Sort payload keys and create string
  const sortedPayload = Object.keys(payload)
    .sort()
    .reduce((acc, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});

  const payloadString = JSON.stringify(sortedPayload);
  const expectedSignature = crypto
    .createHmac('sha512', ipnSecret)
    .update(payloadString)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  // Both strings must be same length for timingSafeEqual
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Payment status types
 */
export const PAYMENT_STATUS = {
  WAITING: 'waiting',
  CONFIRMING: 'confirming',
  CONFIRMED: 'confirmed',
  SENDING: 'sending',
  PARTIALLY_PAID: 'partially_paid',
  FINISHED: 'finished',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  EXPIRED: 'expired',
};

/**
 * Check if payment is successful
 */
export function isPaymentSuccessful(status) {
  return [PAYMENT_STATUS.FINISHED, PAYMENT_STATUS.CONFIRMED].includes(status);
}

/**
 * Check if payment is pending
 */
export function isPaymentPending(status) {
  return [
    PAYMENT_STATUS.WAITING,
    PAYMENT_STATUS.CONFIRMING,
    PAYMENT_STATUS.SENDING,
    PAYMENT_STATUS.PARTIALLY_PAID,
  ].includes(status);
}

/**
 * Plan prices in USD
 */
export const PLAN_PRICES = {
  explorer: { monthly: 19, yearly: 182 },
  professional: { monthly: 49, yearly: 470 },
  enterprise: { monthly: 299, yearly: 2870 },
};

/**
 * Popular cryptocurrencies for payment
 */
export const POPULAR_CRYPTOS = [
  { code: 'btc', name: 'Bitcoin', icon: 'btc' },
  { code: 'eth', name: 'Ethereum', icon: 'eth' },
  { code: 'usdttrc20', name: 'USDT (TRC20)', icon: 'usdt' },
  { code: 'usdterc20', name: 'USDT (ERC20)', icon: 'usdt' },
  { code: 'usdc', name: 'USDC', icon: 'usdc' },
  { code: 'ltc', name: 'Litecoin', icon: 'ltc' },
  { code: 'sol', name: 'Solana', icon: 'sol' },
  { code: 'matic', name: 'Polygon', icon: 'matic' },
];

export default {
  createPayment,
  createInvoice,
  getPaymentStatus,
  getEstimatedPrice,
  getAvailableCurrencies,
  getMinimumAmount,
  getStatus,
  verifyIPN,
  isPaymentSuccessful,
  isPaymentPending,
  PAYMENT_STATUS,
  PLAN_PRICES,
  POPULAR_CRYPTOS,
};
