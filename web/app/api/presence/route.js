import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";

// Initialize Supabase with service role for presence management
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Activity labels for display
const ACTIVITY_LABELS = {
  '/': 'browsing home',
  '/products': 'viewing products',
  '/products/[slug]': 'viewing product',
  '/compare': 'comparing products',
  '/map': 'exploring map',
  '/dashboard': 'in dashboard',
  '/dashboard/setups': 'building stack',
  '/leaderboard': 'checking leaderboard',
  '/incidents': 'viewing incidents',
  '/methodology': 'reading methodology',
};

// GET: Fetch active users for map display
export async function GET(request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get("details") === "true";

    // Get active users (last seen within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    let query = supabase
      .from("user_presence")
      .select(includeDetails
        ? "id, session_id, country, city, lat, lng, current_page, current_action, device_type, avatar_seed, pseudonym, last_seen"
        : "id, country, current_page, current_action, avatar_seed, pseudonym, last_seen"
      )
      .gte("last_seen", fiveMinutesAgo)
      .order("last_seen", { ascending: false })
      .limit(200);

    const { data: activeUsers, error } = await query;

    if (error) {
      console.error("Error fetching presence:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch presence" },
        { status: 500 }
      );
    }

    // Group users by country for map display
    const usersByCountry = {};
    const recentActivities = [];

    activeUsers?.forEach((user, index) => {
      const country = user.country || "XX";

      if (!usersByCountry[country]) {
        usersByCountry[country] = {
          country,
          count: 0,
          users: [],
        };
      }

      usersByCountry[country].count++;
      usersByCountry[country].users.push({
        id: user.id,
        avatarSeed: user.avatar_seed || index,
        pseudonym: user.pseudonym || 'Anonymous',
        currentPage: user.current_page,
        currentAction: user.current_action || ACTIVITY_LABELS[user.current_page] || 'browsing',
        deviceType: user.device_type,
        lastSeen: user.last_seen,
      });

      // Collect recent activities for feed
      if (index < 20 && user.current_action) {
        recentActivities.push({
          country: user.country,
          pseudonym: user.pseudonym || 'Anonymous',
          action: user.current_action,
          page: user.current_page,
          timestamp: user.last_seen,
        });
      }
    });

    // Calculate stats
    const stats = {
      totalOnline: activeUsers?.length || 0,
      byCountry: Object.keys(usersByCountry).length,
      byDevice: {
        desktop: activeUsers?.filter(u => u.device_type === 'desktop').length || 0,
        mobile: activeUsers?.filter(u => u.device_type === 'mobile').length || 0,
        tablet: activeUsers?.filter(u => u.device_type === 'tablet').length || 0,
      },
      topPages: Object.entries(
        activeUsers?.reduce((acc, u) => {
          if (u.current_page) {
            acc[u.current_page] = (acc[u.current_page] || 0) + 1;
          }
          return acc;
        }, {}) || {}
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };

    return NextResponse.json({
      success: true,
      data: {
        users: Object.values(usersByCountry),
        recentActivities,
        stats,
      },
    });
  } catch (error) {
    console.error("Presence GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Update user presence (heartbeat)
export async function POST(request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const {
      sessionId,
      country,
      city,
      lat,
      lng,
      currentPage,
      currentAction,
      deviceType,
      avatarSeed,
      pseudonym,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID required" },
        { status: 400 }
      );
    }

    // Get authenticated user if available
    const session = await auth();
    const userId = session?.user?.id || null;

    // Use account name for authenticated users, pseudonym for anonymous
    const displayName = session?.user?.name || pseudonym || 'Anonymous';

    // Determine action label
    const action = currentAction || ACTIVITY_LABELS[currentPage] || 'browsing';

    // Upsert presence record
    const { data, error } = await supabase
      .from("user_presence")
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          country: country || null,
          city: city || null,
          lat: lat || null,
          lng: lng || null,
          current_page: currentPage || '/',
          current_action: action,
          device_type: deviceType || 'desktop',
          avatar_seed: avatarSeed || Math.floor(Math.random() * 10000),
          pseudonym: displayName,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: "session_id",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating presence:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update presence" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        lastSeen: data.last_seen,
      },
    });
  } catch (error) {
    console.error("Presence POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove user presence (on disconnect)
export async function DELETE(request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("user_presence")
      .delete()
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error deleting presence:", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete presence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
