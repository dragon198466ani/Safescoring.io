/**
 * Lemon Squeezy API helpers
 * Documentation: https://docs.lemonsqueezy.com/api
 */

const LEMON_SQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1";

function getHeaders() {
  if (!process.env.LEMON_SQUEEZY_API_KEY) {
    throw new Error("LEMON_SQUEEZY_API_KEY is not configured");
  }
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
  };
}

/**
 * Create a checkout URL for a variant
 */
export async function createCheckout({
  variantId,
  email,
  userId,
  successUrl,
  cancelUrl,
  discountCode,
}) {
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  if (!storeId) {
    throw new Error("LEMON_SQUEEZY_STORE_ID is not configured");
  }

  const checkoutData = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: email || undefined,
          custom: {
            user_id: userId || undefined,
          },
        },
        checkout_options: {
          embed: false,
          media: true,
          button_color: "#6366f1",
        },
        product_options: {
          redirect_url: successUrl,
          receipt_link_url: successUrl,
        },
        expires_at: null,
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: storeId,
          },
        },
        variant: {
          data: {
            type: "variants",
            id: variantId.toString(),
          },
        },
      },
    },
  };

  // Add discount if provided
  if (discountCode) {
    checkoutData.data.attributes.checkout_data.discount_code = discountCode;
  }

  const response = await fetch(`${LEMON_SQUEEZY_API_URL}/checkouts`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(checkoutData),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Lemon Squeezy checkout error:", error);
    throw new Error(error.errors?.[0]?.detail || "Failed to create checkout");
  }

  const result = await response.json();
  return result.data.attributes.url;
}

/**
 * Get customer portal URL
 */
export async function getCustomerPortalUrl(customerId) {
  const response = await fetch(
    `${LEMON_SQUEEZY_API_URL}/customers/${customerId}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get customer");
  }

  const result = await response.json();
  return result.data.attributes.urls.customer_portal;
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId) {
  const response = await fetch(
    `${LEMON_SQUEEZY_API_URL}/subscriptions/${subscriptionId}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get subscription");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
  const crypto = require("crypto");
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("LEMON_SQUEEZY_WEBHOOK_SECRET not set");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
