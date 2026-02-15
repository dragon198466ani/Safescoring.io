-- Migration: Add double opt-in support to newsletter_subscribers table
-- Run this against your Supabase database

-- Add confirmed_at timestamp (tracks when user confirmed via double opt-in)
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Add resubscribed_at timestamp (tracks re-subscriptions)
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS resubscribed_at TIMESTAMPTZ;

-- Note: The 'status' column should now support 3 values: 'pending', 'active', 'unsubscribed'
-- 'pending' = signed up but not yet confirmed (double opt-in)
-- 'active' = confirmed and subscribed
-- 'unsubscribed' = opted out
