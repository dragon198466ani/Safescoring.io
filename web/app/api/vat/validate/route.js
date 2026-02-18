import { NextResponse } from 'next/server';
import { quickProtect } from '@/libs/api-protection';
import { validateVATNumber } from '@/libs/vies';
import { isEUCountry, determineVATTreatment, getVATRate } from '@/libs/vat-rates';

/**
 * POST /api/vat/validate
 *
 * Validate EU VAT number via VIES and return VAT treatment
 *
 * Body: { vatNumber: string, countryCode: string }
 * Returns: { valid, companyName?, vatTreatment, rate }
 */
export async function POST(req) {
  // Rate limiting (standard tier - not too restrictive for UX)
  const protection = await quickProtect(req, 'standard');
  if (protection.blocked) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status }
    );
  }

  try {
    const body = await req.json();
    const { vatNumber, countryCode } = body;

    // Validate inputs
    if (!vatNumber || typeof vatNumber !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'VAT number is required' },
        { status: 400 }
      );
    }

    if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
      return NextResponse.json(
        { valid: false, error: 'Country code is required (2-letter ISO code)' },
        { status: 400 }
      );
    }

    const code = countryCode.toUpperCase();

    // Check if EU country
    if (!isEUCountry(code)) {
      return NextResponse.json({
        valid: false,
        isEU: false,
        error: 'VAT validation is only available for EU countries',
        countryCode: code,
        vatTreatment: {
          treatment: 'export_exempt',
          rate: 0,
          ratePercent: '0',
          description: 'Outside EU - No VAT applicable',
        },
      });
    }

    // Validate via VIES
    const result = await validateVATNumber(vatNumber, code);

    // Determine VAT treatment based on validation result
    const vatTreatment = determineVATTreatment({
      customerCountry: code,
      isB2B: true, // Since they're providing a VAT number, assume B2B
      vatNumberValid: result.valid === true,
    });

    return NextResponse.json({
      ...result,
      isEU: true,
      vatTreatment,
      countryVATRate: getVATRate(code),
    });

  } catch (error) {
    console.error('VAT validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed - please try again' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vat/validate?country=XX
 *
 * Get VAT rate and treatment info for a country
 * (No VAT number validation, just country info)
 */
export async function GET(req) {
  const protection = await quickProtect(req, 'public');
  if (protection.blocked) {
    return NextResponse.json(
      { error: protection.message },
      { status: protection.status }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get('country')?.toUpperCase();

    if (!countryCode || countryCode.length !== 2) {
      return NextResponse.json(
        { error: 'Country code required (e.g., ?country=FR)' },
        { status: 400 }
      );
    }

    const isEU = isEUCountry(countryCode);
    const rate = getVATRate(countryCode);

    // Get treatment for B2C (default)
    const b2cTreatment = determineVATTreatment({
      customerCountry: countryCode,
      isB2B: false,
      vatNumberValid: false,
    });

    // Get treatment for B2B with valid VAT
    const b2bTreatment = determineVATTreatment({
      customerCountry: countryCode,
      isB2B: true,
      vatNumberValid: true,
    });

    return NextResponse.json({
      countryCode,
      isEU,
      vatRate: rate,
      vatRatePercent: (rate * 100).toFixed(1),
      treatments: {
        b2c: b2cTreatment,
        b2b_valid_vat: b2bTreatment,
      },
    });

  } catch (error) {
    console.error('VAT info error:', error);
    return NextResponse.json(
      { error: 'Failed to get VAT info' },
      { status: 500 }
    );
  }
}
