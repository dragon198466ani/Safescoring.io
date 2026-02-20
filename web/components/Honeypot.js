"use client";

import { useRef, useEffect, useState } from "react";

/**
 * Honeypot Anti-Spam Component
 *
 * Invisible fields that bots will fill but humans won't.
 * Include this in forms to detect and block spam submissions.
 *
 * Usage:
 * <form onSubmit={handleSubmit}>
 *   <Honeypot onBotDetected={handleBot} />
 *   ... other fields
 * </form>
 *
 * In your submit handler:
 * const honeypotData = getHoneypotData(formData);
 * if (honeypotData.isBot) { return; }
 */

// Field names that attract bots
const HONEYPOT_FIELDS = [
  { name: "website", type: "url", autocomplete: "url" },
  { name: "url", type: "text", autocomplete: "off" },
  { name: "phone_number", type: "tel", autocomplete: "tel" },
  { name: "fax", type: "text", autocomplete: "off" },
  { name: "company_website", type: "url", autocomplete: "off" },
];

/**
 * Honeypot invisible fields component
 */
export default function Honeypot({
  onBotDetected = null,
  fieldName = "website",
  enableTiming = true,
  minSubmitTime = 3000, // Minimum ms before form can be submitted
}) {
  const [formLoadTime] = useState(Date.now());
  const [isFilled, setIsFilled] = useState(false);

  // Hidden input ref
  const honeypotRef = useRef(null);

  // Check if honeypot was filled
  const checkHoneypot = () => {
    if (honeypotRef.current?.value) {
      setIsFilled(true);
      onBotDetected?.({
        type: "honeypot_filled",
        field: fieldName,
        value: honeypotRef.current.value,
      });
      return true;
    }
    return false;
  };

  // Check submission timing
  const checkTiming = () => {
    const elapsed = Date.now() - formLoadTime;
    if (enableTiming && elapsed < minSubmitTime) {
      onBotDetected?.({
        type: "too_fast",
        elapsed,
        minimum: minSubmitTime,
      });
      return true;
    }
    return false;
  };

  // Expose check function via ref
  useEffect(() => {
    // Attach check function to parent form
    const form = honeypotRef.current?.closest("form");
    if (form) {
      form.dataset.honeypotCheck = "true";
      form._checkHoneypot = () => checkHoneypot() || checkTiming();
    }
  }, []);

  return (
    <>
      {/* Hidden timestamp field */}
      <input
        type="hidden"
        name="_form_time"
        value={formLoadTime}
      />

      {/* Honeypot field - hidden via CSS, not display:none (bots detect that) */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          opacity: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <label htmlFor={fieldName}>
          Leave this field empty
        </label>
        <input
          ref={honeypotRef}
          type="text"
          name={fieldName}
          id={fieldName}
          autoComplete="off"
          tabIndex={-1}
          onChange={checkHoneypot}
        />
      </div>

      {/* Additional decoy fields */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          opacity: 0,
          height: 0,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <input
          type="text"
          name="phone_verify"
          autoComplete="off"
          tabIndex={-1}
        />
        <input
          type="email"
          name="email_confirm"
          autoComplete="off"
          tabIndex={-1}
        />
      </div>
    </>
  );
}

/**
 * Extract and validate honeypot data from form
 */
export function getHoneypotData(formData) {
  const data = formData instanceof FormData
    ? Object.fromEntries(formData)
    : formData;

  const result = {
    isBot: false,
    reasons: [],
  };

  // Check honeypot fields
  const honeypotFields = ["website", "url", "phone_verify", "email_confirm", "fax"];
  for (const field of honeypotFields) {
    if (data[field]) {
      result.isBot = true;
      result.reasons.push(`Honeypot field "${field}" was filled`);
    }
  }

  // Check timing
  const formTime = parseInt(data._form_time, 10);
  if (formTime) {
    const elapsed = Date.now() - formTime;
    if (elapsed < 2000) { // Less than 2 seconds
      result.isBot = true;
      result.reasons.push(`Form submitted too quickly (${elapsed}ms)`);
    }
    if (elapsed > 3600000) { // More than 1 hour
      result.isBot = true;
      result.reasons.push("Form token expired");
    }
  }

  return result;
}

/**
 * Validate honeypot on server side
 */
export function validateHoneypot(body) {
  const result = {
    valid: true,
    isBot: false,
    reasons: [],
  };

  // Check common honeypot field names
  const suspiciousFields = [
    "website", "url", "phone_verify", "email_confirm",
    "fax", "company_website", "homepage",
  ];

  for (const field of suspiciousFields) {
    if (body[field]) {
      result.valid = false;
      result.isBot = true;
      result.reasons.push(`Honeypot: ${field}`);
    }
  }

  // Check timing
  if (body._form_time) {
    const elapsed = Date.now() - parseInt(body._form_time, 10);
    if (elapsed < 1500) {
      result.valid = false;
      result.isBot = true;
      result.reasons.push(`Speed: ${elapsed}ms`);
    }
  }

  return result;
}

/**
 * React hook for honeypot form protection
 */
export function useHoneypot(options = {}) {
  const {
    minSubmitTime = 3000,
    onBotDetected = null,
  } = options;

  const [formLoadTime] = useState(Date.now());
  const [honeypotValue, setHoneypotValue] = useState("");
  const [isBot, setIsBot] = useState(false);

  const checkSubmission = () => {
    const reasons = [];

    // Check honeypot
    if (honeypotValue) {
      reasons.push("Honeypot filled");
    }

    // Check timing
    const elapsed = Date.now() - formLoadTime;
    if (elapsed < minSubmitTime) {
      reasons.push(`Too fast: ${elapsed}ms`);
    }

    if (reasons.length > 0) {
      setIsBot(true);
      onBotDetected?.({ reasons, elapsed });
      return false;
    }

    return true;
  };

  return {
    formLoadTime,
    honeypotValue,
    setHoneypotValue,
    isBot,
    checkSubmission,
    honeypotProps: {
      name: "website",
      value: honeypotValue,
      onChange: (e) => setHoneypotValue(e.target.value),
      style: { position: "absolute", left: "-9999px", opacity: 0 },
      tabIndex: -1,
      autoComplete: "off",
      "aria-hidden": true,
    },
    hiddenTimeField: {
      type: "hidden",
      name: "_form_time",
      value: formLoadTime,
    },
  };
}
