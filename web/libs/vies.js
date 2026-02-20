/**
 * VIES (VAT Information Exchange System) Integration
 *
 * Official EU service for VAT number validation
 * API: https://ec.europa.eu/taxation_customs/vies/
 *
 * Features:
 * - SOAP API call to VIES
 * - 30-day caching in database
 * - Graceful fallback if VIES unavailable
 * - Format validation before API call
 */

import { createClient } from '@supabase/supabase-js';
import {
  formatVATNumber,
  validateVATNumberFormat,
  isEUCountry
} from './vat-rates';

// VIES SOAP endpoint
const VIES_ENDPOINT = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';

// Cache TTL in days
const CACHE_TTL_DAYS = 30;

/**
 * Build SOAP request for VIES
 */
function buildVIESRequest(countryCode, vatNumber) {
  // Remove country prefix if present
  const numberOnly = vatNumber.replace(/^[A-Z]{2}/i, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${countryCode}</urn:countryCode>
      <urn:vatNumber>${numberOnly}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Parse VIES SOAP response
 */
function parseVIESResponse(xml) {
  const getTag = (tag) => {
    const match = xml.match(new RegExp(`<[^:]*:${tag}>([^<]*)<`));
    return match ? match[1].trim() : null;
  };

  const valid = getTag('valid');

  return {
    valid: valid === 'true',
    countryCode: getTag('countryCode'),
    vatNumber: getTag('vatNumber'),
    name: getTag('name') || null,
    address: getTag('address')?.replace(/\n/g, ', ') || null,
    requestDate: getTag('requestDate'),
    requestIdentifier: `vies_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

/**
 * Get Supabase admin client
 */
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Check cache for existing validation
 */
async function checkCache(vatNumber, countryCode) {
  try {
    const supabase = getSupabaseAdmin();

    const { data } = await supabase
      .from('vat_validations')
      .select('*')
      .eq('vat_number', vatNumber)
      .eq('country_code', countryCode)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (data) {
      return {
        valid: data.is_valid,
        cached: true,
        companyName: data.company_name,
        companyAddress: data.company_address,
        validatedAt: data.validated_at,
        requestIdentifier: data.request_identifier,
        countryCode,
        vatNumber,
      };
    }
  } catch {
    // Cache miss or error - continue to API call
  }

  return null;
}

/**
 * Store validation result in cache
 */
async function storeInCache(result, countryCode, formattedVAT) {
  try {
    const supabase = getSupabaseAdmin();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await supabase
      .from('vat_validations')
      .upsert({
        vat_number: formattedVAT,
        country_code: countryCode,
        is_valid: result.valid,
        company_name: result.name,
        company_address: result.address,
        request_identifier: result.requestIdentifier,
        validated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        raw_response: { cached_at: new Date().toISOString() },
      }, {
        onConflict: 'vat_number,country_code',
      });
  } catch (err) {
    console.error('Failed to cache VAT validation:', err);
    // Non-critical, continue
  }
}

/**
 * Validate VAT number via VIES API
 *
 * @param {string} vatNumber - VAT number (with or without country prefix)
 * @param {string} countryCode - ISO 2-letter country code
 * @returns {Promise<Object>} Validation result
 */
export async function validateVATNumber(vatNumber, countryCode) {
  const code = countryCode?.toUpperCase();

  // 1. Check if EU country
  if (!isEUCountry(code)) {
    return {
      valid: false,
      error: 'Not an EU country - VAT validation not applicable',
      countryCode: code,
      vatNumber,
    };
  }

  // 2. Validate format first
  const formatCheck = validateVATNumberFormat(vatNumber, code);
  if (!formatCheck.valid) {
    return {
      valid: false,
      error: formatCheck.error,
      countryCode: code,
      vatNumber,
    };
  }

  const formattedVAT = formatCheck.formatted;

  // 3. Check cache
  const cached = await checkCache(formattedVAT, code);
  if (cached) {
    return cached;
  }

  // 4. Call VIES API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(VIES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
      body: buildVIESRequest(code, formattedVAT),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`VIES returned HTTP ${response.status}`);
    }

    const xml = await response.text();

    // Check for SOAP fault
    if (xml.includes('Fault') || xml.includes('INVALID_INPUT')) {
      return {
        valid: false,
        error: 'Invalid VAT number',
        countryCode: code,
        vatNumber: formattedVAT,
      };
    }

    const result = parseVIESResponse(xml);

    // 5. Cache the result
    await storeInCache(result, code, formattedVAT);

    return {
      valid: result.valid,
      cached: false,
      companyName: result.name,
      companyAddress: result.address,
      validatedAt: new Date().toISOString(),
      requestIdentifier: result.requestIdentifier,
      countryCode: code,
      vatNumber: formattedVAT,
    };

  } catch (error) {
    console.error('VIES validation error:', error);

    // VIES unavailable - return unknown status
    if (error.name === 'AbortError') {
      return {
        valid: null, // Unknown - VIES timeout
        error: 'VIES service timeout - please try again',
        requiresManualReview: true,
        countryCode: code,
        vatNumber: formattedVAT,
      };
    }

    // Check if it's a network error (VIES down)
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return {
        valid: null,
        error: 'VIES service unavailable - please try again later',
        requiresManualReview: true,
        countryCode: code,
        vatNumber: formattedVAT,
      };
    }

    return {
      valid: false,
      error: error.message || 'Validation failed',
      countryCode: code,
      vatNumber: formattedVAT,
    };
  }
}

/**
 * Batch validate multiple VAT numbers
 * Useful for admin tools
 */
export async function validateVATNumbersBatch(vatNumbers) {
  const results = await Promise.allSettled(
    vatNumbers.map(({ vatNumber, countryCode }) =>
      validateVATNumber(vatNumber, countryCode)
    )
  );

  return results.map((result, index) => ({
    input: vatNumbers[index],
    result: result.status === 'fulfilled' ? result.value : { valid: false, error: result.reason?.message },
  }));
}

/**
 * Clear expired cache entries
 * Should be run periodically (cron job)
 */
export async function cleanupExpiredCache() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('vat_validations')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) throw error;

    return { deleted: data?.length || 0 };
  } catch (err) {
    console.error('Failed to cleanup VAT cache:', err);
    return { deleted: 0, error: err.message };
  }
}
