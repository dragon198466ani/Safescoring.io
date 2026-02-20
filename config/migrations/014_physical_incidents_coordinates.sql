-- ============================================================
-- MIGRATION 014: ADD COORDINATES TO PHYSICAL INCIDENTS
-- ============================================================
-- Purpose: Populate location_coordinates for existing physical incidents
-- Date: 2025-01-03
-- Note: Uses approximate city center coordinates for map visualization
-- ============================================================

-- Update Dubai incidents
UPDATE physical_incidents
SET location_coordinates = POINT(55.2708, 25.2048)
WHERE location_city ILIKE '%dubai%' AND location_country = 'AE'
AND location_coordinates IS NULL;

-- Update Hong Kong incidents
UPDATE physical_incidents
SET location_coordinates = POINT(114.1694, 22.3193)
WHERE (location_city ILIKE '%hong kong%' OR location_country = 'HK')
AND location_coordinates IS NULL;

-- Update Thailand incidents (Phuket, Bangkok, etc.)
UPDATE physical_incidents
SET location_coordinates = POINT(98.3923, 7.8804)
WHERE location_city ILIKE '%phuket%' AND location_country = 'TH'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(100.5018, 13.7563)
WHERE location_city ILIKE '%bangkok%' AND location_country = 'TH'
AND location_coordinates IS NULL;

-- Update Brazil incidents (São Paulo, Rio)
UPDATE physical_incidents
SET location_coordinates = POINT(-46.6333, -23.5505)
WHERE location_city ILIKE '%paulo%' AND location_country = 'BR'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-43.1729, -22.9068)
WHERE location_city ILIKE '%rio%' AND location_country = 'BR'
AND location_coordinates IS NULL;

-- Update Russia incidents (Moscow, St Petersburg)
UPDATE physical_incidents
SET location_coordinates = POINT(37.6173, 55.7558)
WHERE location_city ILIKE '%moscow%' AND location_country = 'RU'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(30.3351, 59.9343)
WHERE location_city ILIKE '%petersburg%' AND location_country = 'RU'
AND location_coordinates IS NULL;

-- Update UK incidents (London, etc.)
UPDATE physical_incidents
SET location_coordinates = POINT(-0.1276, 51.5074)
WHERE location_city ILIKE '%london%' AND location_country = 'GB'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-1.8904, 52.4862)
WHERE location_city ILIKE '%birmingham%' AND location_country = 'GB'
AND location_coordinates IS NULL;

-- Update USA incidents (Miami, LA, NYC, etc.)
UPDATE physical_incidents
SET location_coordinates = POINT(-80.1918, 25.7617)
WHERE location_city ILIKE '%miami%' AND location_country = 'US'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-118.2437, 34.0522)
WHERE (location_city ILIKE '%los angeles%' OR location_city ILIKE '%la%')
AND location_country = 'US'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-74.0060, 40.7128)
WHERE (location_city ILIKE '%new york%' OR location_city ILIKE '%nyc%')
AND location_country = 'US'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-122.4194, 37.7749)
WHERE (location_city ILIKE '%san francisco%' OR location_city ILIKE '%sf%')
AND location_country = 'US'
AND location_coordinates IS NULL;

-- Update China incidents (Shenzhen, Beijing, Shanghai)
UPDATE physical_incidents
SET location_coordinates = POINT(114.0579, 22.5431)
WHERE location_city ILIKE '%shenzhen%' AND location_country = 'CN'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(116.4074, 39.9042)
WHERE location_city ILIKE '%beijing%' AND location_country = 'CN'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(121.4737, 31.2304)
WHERE location_city ILIKE '%shanghai%' AND location_country = 'CN'
AND location_coordinates IS NULL;

-- Update Singapore
UPDATE physical_incidents
SET location_coordinates = POINT(103.8198, 1.3521)
WHERE location_country = 'SG'
AND location_coordinates IS NULL;

-- Update South Korea (Seoul)
UPDATE physical_incidents
SET location_coordinates = POINT(126.9780, 37.5665)
WHERE location_city ILIKE '%seoul%' AND location_country = 'KR'
AND location_coordinates IS NULL;

-- Update Japan (Tokyo)
UPDATE physical_incidents
SET location_coordinates = POINT(139.6917, 35.6895)
WHERE location_city ILIKE '%tokyo%' AND location_country = 'JP'
AND location_coordinates IS NULL;

-- Update France (Paris)
UPDATE physical_incidents
SET location_coordinates = POINT(2.3522, 48.8566)
WHERE location_city ILIKE '%paris%' AND location_country = 'FR'
AND location_coordinates IS NULL;

-- Update Germany (Berlin, Munich, Frankfurt)
UPDATE physical_incidents
SET location_coordinates = POINT(13.4050, 52.5200)
WHERE location_city ILIKE '%berlin%' AND location_country = 'DE'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(11.5820, 48.1351)
WHERE location_city ILIKE '%munich%' AND location_country = 'DE'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(8.6821, 50.1109)
WHERE location_city ILIKE '%frankfurt%' AND location_country = 'DE'
AND location_coordinates IS NULL;

-- Update Netherlands (Amsterdam)
UPDATE physical_incidents
SET location_coordinates = POINT(4.9041, 52.3676)
WHERE location_city ILIKE '%amsterdam%' AND location_country = 'NL'
AND location_coordinates IS NULL;

-- Update Switzerland (Zurich, Geneva)
UPDATE physical_incidents
SET location_coordinates = POINT(8.5417, 47.3769)
WHERE location_city ILIKE '%zurich%' AND location_country = 'CH'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(6.1432, 46.2044)
WHERE location_city ILIKE '%geneva%' AND location_country = 'CH'
AND location_coordinates IS NULL;

-- Update Spain (Madrid, Barcelona)
UPDATE physical_incidents
SET location_coordinates = POINT(-3.7038, 40.4168)
WHERE location_city ILIKE '%madrid%' AND location_country = 'ES'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(2.1734, 41.3851)
WHERE location_city ILIKE '%barcelona%' AND location_country = 'ES'
AND location_coordinates IS NULL;

-- Update Italy (Rome, Milan)
UPDATE physical_incidents
SET location_coordinates = POINT(12.4964, 41.9028)
WHERE location_city ILIKE '%rom%' AND location_country = 'IT'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(9.1900, 45.4642)
WHERE location_city ILIKE '%milan%' AND location_country = 'IT'
AND location_coordinates IS NULL;

-- Update Portugal (Lisbon)
UPDATE physical_incidents
SET location_coordinates = POINT(-9.1393, 38.7223)
WHERE location_city ILIKE '%lisbon%' AND location_country = 'PT'
AND location_coordinates IS NULL;

-- Update Australia (Sydney, Melbourne)
UPDATE physical_incidents
SET location_coordinates = POINT(151.2093, -33.8688)
WHERE location_city ILIKE '%sydney%' AND location_country = 'AU'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(144.9631, -37.8136)
WHERE location_city ILIKE '%melbourne%' AND location_country = 'AU'
AND location_coordinates IS NULL;

-- Update Canada (Toronto, Vancouver)
UPDATE physical_incidents
SET location_coordinates = POINT(-79.3832, 43.6532)
WHERE location_city ILIKE '%toronto%' AND location_country = 'CA'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-123.1216, 49.2827)
WHERE location_city ILIKE '%vancouver%' AND location_country = 'CA'
AND location_coordinates IS NULL;

-- Update Mexico (Mexico City)
UPDATE physical_incidents
SET location_coordinates = POINT(-99.1332, 19.4326)
WHERE location_city ILIKE '%mexico%' AND location_country = 'MX'
AND location_coordinates IS NULL;

-- Update Argentina (Buenos Aires)
UPDATE physical_incidents
SET location_coordinates = POINT(-58.3816, -34.6037)
WHERE location_city ILIKE '%buenos%' AND location_country = 'AR'
AND location_coordinates IS NULL;

-- Update Nigeria (Lagos)
UPDATE physical_incidents
SET location_coordinates = POINT(3.3792, 6.5244)
WHERE location_city ILIKE '%lagos%' AND location_country = 'NG'
AND location_coordinates IS NULL;

-- Update South Africa (Johannesburg, Cape Town)
UPDATE physical_incidents
SET location_coordinates = POINT(28.0473, -26.2041)
WHERE location_city ILIKE '%johannesburg%' AND location_country = 'ZA'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(18.4241, -33.9249)
WHERE location_city ILIKE '%cape%town%' AND location_country = 'ZA'
AND location_coordinates IS NULL;

-- Update India (Mumbai, Delhi, Bangalore)
UPDATE physical_incidents
SET location_coordinates = POINT(72.8777, 19.0760)
WHERE location_city ILIKE '%mumbai%' AND location_country = 'IN'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(77.2090, 28.6139)
WHERE location_city ILIKE '%delhi%' AND location_country = 'IN'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(77.5946, 12.9716)
WHERE location_city ILIKE '%bangalore%' AND location_country = 'IN'
AND location_coordinates IS NULL;

-- Update Indonesia (Jakarta)
UPDATE physical_incidents
SET location_coordinates = POINT(106.8456, -6.2088)
WHERE location_city ILIKE '%jakarta%' AND location_country = 'ID'
AND location_coordinates IS NULL;

-- Update Malaysia (Kuala Lumpur)
UPDATE physical_incidents
SET location_coordinates = POINT(101.6869, 3.1390)
WHERE location_city ILIKE '%kuala%' AND location_country = 'MY'
AND location_coordinates IS NULL;

-- Update Vietnam (Ho Chi Minh, Hanoi)
UPDATE physical_incidents
SET location_coordinates = POINT(106.6297, 10.8231)
WHERE (location_city ILIKE '%ho chi minh%' OR location_city ILIKE '%saigon%')
AND location_country = 'VN'
AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(105.8342, 21.0278)
WHERE location_city ILIKE '%hanoi%' AND location_country = 'VN'
AND location_coordinates IS NULL;

-- Update Philippines (Manila)
UPDATE physical_incidents
SET location_coordinates = POINT(120.9842, 14.5995)
WHERE location_city ILIKE '%manila%' AND location_country = 'PH'
AND location_coordinates IS NULL;

-- Update Taiwan (Taipei)
UPDATE physical_incidents
SET location_coordinates = POINT(121.5654, 25.0330)
WHERE location_city ILIKE '%taipei%' AND location_country = 'TW'
AND location_coordinates IS NULL;

-- Update Turkey (Istanbul)
UPDATE physical_incidents
SET location_coordinates = POINT(28.9784, 41.0082)
WHERE location_city ILIKE '%istanbul%' AND location_country = 'TR'
AND location_coordinates IS NULL;

-- Update Ukraine (Kyiv)
UPDATE physical_incidents
SET location_coordinates = POINT(30.5234, 50.4501)
WHERE location_city ILIKE '%kyiv%' AND location_country = 'UA'
AND location_coordinates IS NULL;

-- Update Poland (Warsaw)
UPDATE physical_incidents
SET location_coordinates = POINT(21.0122, 52.2297)
WHERE location_city ILIKE '%warsaw%' AND location_country = 'PL'
AND location_coordinates IS NULL;

-- ============================================================
-- FALLBACK: Update remaining incidents by country capital
-- ============================================================
-- For incidents that still don't have coordinates, use country capital

UPDATE physical_incidents
SET location_coordinates = POINT(55.2708, 25.2048)
WHERE location_country = 'AE' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(114.1694, 22.3193)
WHERE location_country = 'HK' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(100.5018, 13.7563)
WHERE location_country = 'TH' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-47.9292, -15.7801)
WHERE location_country = 'BR' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(37.6173, 55.7558)
WHERE location_country = 'RU' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-0.1276, 51.5074)
WHERE location_country = 'GB' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-77.0369, 38.9072)
WHERE location_country = 'US' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(116.4074, 39.9042)
WHERE location_country = 'CN' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(103.8198, 1.3521)
WHERE location_country = 'SG' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(126.9780, 37.5665)
WHERE location_country = 'KR' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(139.6917, 35.6895)
WHERE location_country = 'JP' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(2.3522, 48.8566)
WHERE location_country = 'FR' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(13.4050, 52.5200)
WHERE location_country = 'DE' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(4.9041, 52.3676)
WHERE location_country = 'NL' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(8.5417, 47.3769)
WHERE location_country = 'CH' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-3.7038, 40.4168)
WHERE location_country = 'ES' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(12.4964, 41.9028)
WHERE location_country = 'IT' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-9.1393, 38.7223)
WHERE location_country = 'PT' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(149.1300, -35.2809)
WHERE location_country = 'AU' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-75.6972, 45.4215)
WHERE location_country = 'CA' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-99.1332, 19.4326)
WHERE location_country = 'MX' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(-58.3816, -34.6037)
WHERE location_country = 'AR' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(7.4898, 9.0579)
WHERE location_country = 'NG' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(28.0473, -26.2041)
WHERE location_country = 'ZA' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(77.2090, 28.6139)
WHERE location_country = 'IN' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(106.8456, -6.2088)
WHERE location_country = 'ID' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(101.6869, 3.1390)
WHERE location_country = 'MY' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(105.8342, 21.0278)
WHERE location_country = 'VN' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(120.9842, 14.5995)
WHERE location_country = 'PH' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(121.5654, 25.0330)
WHERE location_country = 'TW' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(32.8597, 39.9334)
WHERE location_country = 'TR' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(30.5234, 50.4501)
WHERE location_country = 'UA' AND location_coordinates IS NULL;

UPDATE physical_incidents
SET location_coordinates = POINT(21.0122, 52.2297)
WHERE location_country = 'PL' AND location_coordinates IS NULL;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT
    'Coordinates migration completed!' as status,
    COUNT(*) as total_incidents,
    COUNT(*) FILTER (WHERE location_coordinates IS NOT NULL) as with_coordinates,
    COUNT(*) FILTER (WHERE location_coordinates IS NULL) as missing_coordinates
FROM physical_incidents;

-- ============================================================
-- END OF MIGRATION 014
-- ============================================================
