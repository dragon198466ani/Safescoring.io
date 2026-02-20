import { supabase } from "@/libs/supabase";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Generate anonymous hash for a user
function generateAnonHash(userId, timestamp) {
  const data = `${userId}-${timestamp}-${process.env.NEXTAUTH_SECRET || 'salt'}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 12);
}

// GET - Fetch public/shared stacks for the community map
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch setups that are marked as public/shared
    const { data: setups, error } = await supabase
      .from('setups')
      .select(`
        id,
        name,
        is_public,
        share_anonymous,
        country,
        created_at,
        updated_at,
        setup_products (
          product_id,
          role,
          products (
            id,
            name,
            slug,
            type_name,
            country_origin,
            logo
          )
        )
      `)
      .or('is_public.eq.true,share_anonymous.eq.true')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching community stacks:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch stacks' }, { status: 500 });
    }

    // Transform data for anonymous display
    const communityStacks = (setups || []).map((setup, idx) => {
      const isAnonymous = setup.share_anonymous && !setup.is_public;
      const timestamp = new Date(setup.created_at).getTime();

      return {
        id: setup.id,
        hash: isAnonymous ? generateAnonHash(setup.id, timestamp) : null,
        name: isAnonymous ? `Stack #${generateAnonHash(setup.id, timestamp).substring(0, 6)}` : (setup.name || `Setup ${setup.id}`),
        isAnonymous,
        country: setup.country || 'XX',
        productCount: setup.setup_products?.length || 0,
        products: setup.setup_products?.map(sp => ({
          id: sp.products?.id,
          name: sp.products?.name,
          slug: sp.products?.slug,
          type: sp.products?.type_name,
          role: sp.role,
          logo: sp.products?.logo,
          country: sp.products?.country_origin,
        })).filter(p => p.id) || [],
        // For globe positioning - aggregate from products or use random based on hash
        location: getStackLocation(setup),
        updatedAt: setup.updated_at,
      };
    });

    // Get stats
    const totalCount = communityStacks.length;
    const anonymousCount = communityStacks.filter(s => s.isAnonymous).length;
    const countriesRepresented = [...new Set(communityStacks.map(s => s.country).filter(c => c && c !== 'XX'))];

    return NextResponse.json({
      success: true,
      stacks: communityStacks,
      stats: {
        total: totalCount,
        anonymous: anonymousCount,
        public: totalCount - anonymousCount,
        countries: countriesRepresented.length,
      },
      pagination: {
        limit,
        offset,
        hasMore: communityStacks.length === limit,
      }
    });

  } catch (error) {
    console.error('Community stacks API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get stack location for globe display
function getStackLocation(setup) {
  // Try to get location from products
  const countries = setup.setup_products
    ?.map(sp => sp.products?.country_origin)
    .filter(c => c && c !== 'XX') || [];

  if (countries.length > 0) {
    // Use the most common country
    const countryCount = {};
    countries.forEach(c => { countryCount[c] = (countryCount[c] || 0) + 1; });
    const mainCountry = Object.entries(countryCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    return getCountryCoords(mainCountry);
  }

  // Use setup country
  if (setup.country && setup.country !== 'XX') {
    return getCountryCoords(setup.country);
  }

  // Generate pseudo-random location based on setup id
  const hash = setup.id.toString();
  const lat = (parseInt(hash, 36) % 140) - 70; // -70 to 70
  const lng = (parseInt(hash.split('').reverse().join(''), 36) % 360) - 180; // -180 to 180
  return { lat, lng, country: 'XX' };
}

// Simple country to coordinates mapping
function getCountryCoords(countryCode) {
  const coords = {
    US: { lat: 37.09, lng: -95.71, country: 'US' },
    GB: { lat: 55.37, lng: -3.43, country: 'GB' },
    DE: { lat: 51.16, lng: 10.45, country: 'DE' },
    FR: { lat: 46.22, lng: 2.21, country: 'FR' },
    JP: { lat: 36.20, lng: 138.25, country: 'JP' },
    CN: { lat: 35.86, lng: 104.19, country: 'CN' },
    SG: { lat: 1.35, lng: 103.81, country: 'SG' },
    CH: { lat: 46.81, lng: 8.22, country: 'CH' },
    CA: { lat: 56.13, lng: -106.34, country: 'CA' },
    AU: { lat: -25.27, lng: 133.77, country: 'AU' },
    KR: { lat: 35.90, lng: 127.76, country: 'KR' },
    IN: { lat: 20.59, lng: 78.96, country: 'IN' },
    BR: { lat: -14.23, lng: -51.92, country: 'BR' },
    NL: { lat: 52.13, lng: 5.29, country: 'NL' },
    ES: { lat: 40.46, lng: -3.74, country: 'ES' },
    IT: { lat: 41.87, lng: 12.56, country: 'IT' },
    RU: { lat: 61.52, lng: 105.31, country: 'RU' },
    AE: { lat: 23.42, lng: 53.84, country: 'AE' },
    HK: { lat: 22.39, lng: 114.10, country: 'HK' },
    SE: { lat: 60.12, lng: 18.64, country: 'SE' },
  };
  return coords[countryCode] || { lat: 0, lng: 0, country: countryCode || 'XX' };
}

// POST - Share your stack to the community (anonymous option)
export async function POST(request) {
  try {
    const body = await request.json();
    const { setupId, shareAnonymous = true, isPublic = false } = body;

    if (!setupId) {
      return NextResponse.json({ success: false, error: 'Setup ID required' }, { status: 400 });
    }

    // Update setup sharing settings
    const { data, error } = await supabase
      .from('setups')
      .update({
        share_anonymous: shareAnonymous,
        is_public: isPublic,
        shared_at: new Date().toISOString(),
      })
      .eq('id', setupId)
      .select()
      .single();

    if (error) {
      console.error('Error sharing stack:', error);
      return NextResponse.json({ success: false, error: 'Failed to share stack' }, { status: 500 });
    }

    const hash = generateAnonHash(setupId, new Date(data.created_at).getTime());

    return NextResponse.json({
      success: true,
      message: shareAnonymous ? 'Stack shared anonymously' : 'Stack shared publicly',
      hash: shareAnonymous ? hash : null,
      shareUrl: `/map?stack=${hash}`,
    });

  } catch (error) {
    console.error('Share stack API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
