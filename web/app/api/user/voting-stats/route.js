import { NextResponse } from 'next/server';
import { supabase } from '@/libs/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { applyUserRateLimit } from "@/libs/rate-limiters";

export async function GET(req) {
  // SECURITY: Rate limiting (100 req/10min per user)
  const rateLimitResult = await applyUserRateLimit(req);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: stats } = await supabase
      .from('token_rewards')
      .select('*')
      .eq('user_hash', session.user.email)
      .single();

    return NextResponse.json(stats || {
      total_tokens: 0,
      votes_submitted: 0,
      votes_validated: 0,
      challenges_won: 0,
      daily_streak: 0
    });
  } catch (error) {
    console.error('Voting stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
