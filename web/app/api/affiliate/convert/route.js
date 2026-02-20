import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";

/**
 * Affiliate Conversion Tracking
 *
 * POST - Record a conversion event
 *
 * Called when a referred user completes a valuable action:
 * - signup: User creates an account
 * - subscription: User subscribes to a paid plan
 * - api_key: User creates their first API key
 * - upgrade: User upgrades their plan
 */

// Commission rates by conversion type
const COMMISSION_RATES = {
  signup: 0,         // No commission for signup alone
  api_key: 0,        // No commission for free API key
  subscription: 0.20, // 20% of first payment
  upgrade: 0.20,      // 20% of upgrade payment
};

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const { affiliateId, clickId, userId, type, value = 0, metadata = {} } = await request.json();

    if (!affiliateId || !userId || !type) {
      return NextResponse.json(
        { error: "affiliateId, userId, and type are required" },
        { status: 400 }
      );
    }

    // Validate conversion type
    if (!Object.prototype.hasOwnProperty.call(COMMISSION_RATES, type)) {
      return NextResponse.json(
        { error: "Invalid conversion type" },
        { status: 400 }
      );
    }

    // Verify affiliate exists and is active
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id, commission_rate, status")
      .eq("id", affiliateId)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    if (affiliate.status !== "approved") {
      return NextResponse.json({ error: "Affiliate not active" }, { status: 400 });
    }

    // Check if this user was already converted by this affiliate
    const { count: existingConversions } = await supabase
      .from("affiliate_conversions")
      .select("*", { count: "exact", head: true })
      .eq("affiliate_id", affiliateId)
      .eq("user_id", userId)
      .eq("type", type);

    if (existingConversions > 0) {
      return NextResponse.json({
        converted: false,
        reason: "duplicate",
        message: "User already converted for this type",
      });
    }

    // Calculate commission
    const baseRate = COMMISSION_RATES[type];
    const affiliateRate = parseFloat(affiliate.commission_rate) / 100;
    const commission = value * (baseRate > 0 ? affiliateRate : 0);

    // Record conversion
    const { data: conversion, error: conversionError } = await supabase
      .from("affiliate_conversions")
      .insert({
        affiliate_id: affiliateId,
        click_id: clickId || null,
        user_id: userId,
        type,
        value: parseFloat(value),
        commission: commission,
        status: commission > 0 ? "pending" : "approved",
        metadata,
      })
      .select("id, commission, status")
      .single();

    if (conversionError) {
      console.error("Error recording conversion:", conversionError);
      return NextResponse.json({ error: "Failed to record conversion" }, { status: 500 });
    }

    return NextResponse.json({
      converted: true,
      conversion: {
        id: conversion.id,
        commission: conversion.commission,
        status: conversion.status,
      },
    });

  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
