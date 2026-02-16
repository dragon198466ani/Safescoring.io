-- Migration: Add referral system columns to users table
-- Run this against your Supabase database

-- Referral code (unique per user, generated on first access)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;

-- Who referred this user (stores the referrer's referral_code)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(12);

-- Count of successful referrals
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;

-- Index for fast lookup when a new user signs up with ?ref=CODE
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
