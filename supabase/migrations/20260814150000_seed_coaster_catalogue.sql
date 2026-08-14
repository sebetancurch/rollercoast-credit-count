-- The shared coaster catalogue.
--
-- Reference data, not test data: every environment needs it, because credit
-- counts are only comparable when everyone counts against the same list. That
-- is why it lives in a migration rather than in seed.sql, which holds the local
-- test users and their ride history and never reaches a deployed project.
--
-- Ids are derived from the ordinal rather than generated, so every environment
-- holds byte-identical rows and a ride can be moved between them.
--
-- "Icon" and "ICON" at Blackpool Pleasure Beach are deliberate. There is no
-- unique constraint on (name, park): duplicates are a real data-quality problem
-- an admin curates away, and the catalogue's "Possible duplicates" filter exists
-- to surface exactly this pair.
--
-- Idempotent, so re-running it after a partial apply is safe.

insert into public.coasters (id, name, park, country, manufacturer, type) values
  ('c0a57e00-0000-4000-8000-000000000001', 'Nemesis', 'Alton Towers', 'United Kingdom', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000002', 'Wicker Man', 'Alton Towers', 'United Kingdom', 'Great Coasters International', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000003', 'The Smiler', 'Alton Towers', 'United Kingdom', 'Gerstlauer', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000004', 'Oblivion', 'Alton Towers', 'United Kingdom', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000005', 'Icon', 'Blackpool Pleasure Beach', 'United Kingdom', 'Mack Rides', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000006', 'The Big One', 'Blackpool Pleasure Beach', 'United Kingdom', 'Arrow Dynamics', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000007', 'Grand National', 'Blackpool Pleasure Beach', 'United Kingdom', 'Charles Paige', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000008', 'ICON', 'Blackpool Pleasure Beach', 'United Kingdom', 'Mack Rides', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000009', 'Stealth', 'Thorpe Park', 'United Kingdom', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000010', 'Nemesis Inferno', 'Thorpe Park', 'United Kingdom', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000011', 'Colossus', 'Thorpe Park', 'United Kingdom', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000012', 'Megafobia', 'Oakwood Theme Park', 'United Kingdom', 'Custom Coasters International', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000013', 'Steel Vengeance', 'Cedar Point', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  ('c0a57e00-0000-4000-8000-000000000014', 'Millennium Force', 'Cedar Point', 'United States', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000015', 'Maverick', 'Cedar Point', 'United States', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000016', 'Top Thrill 2', 'Cedar Point', 'United States', 'Zamperla', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000017', 'El Toro', 'Six Flags Great Adventure', 'United States', 'Intamin', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000018', 'Fury 325', 'Carowinds', 'United States', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000019', 'VelociCoaster', 'Universal Islands of Adventure', 'United States', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000020', 'Iron Gwazi', 'Busch Gardens Tampa Bay', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  ('c0a57e00-0000-4000-8000-000000000021', 'Twisted Colossus', 'Six Flags Magic Mountain', 'United States', 'Rocky Mountain Construction', 'Hybrid'),
  ('c0a57e00-0000-4000-8000-000000000022', 'X2', 'Six Flags Magic Mountain', 'United States', 'Arrow Dynamics', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000023', 'The Voyage', 'Holiday World', 'United States', 'The Gravity Group', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000024', 'Phoenix', 'Knoebels', 'United States', 'Herbert Schmeck', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000025', 'Boulder Dash', 'Lake Compounce', 'United States', 'Custom Coasters International', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000026', 'Taron', 'Phantasialand', 'Germany', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000027', 'Black Mamba', 'Phantasialand', 'Germany', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000028', 'Wodan Timbur Coaster', 'Europa-Park', 'Germany', 'Great Coasters International', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000029', 'Blue Fire Megacoaster', 'Europa-Park', 'Germany', 'Mack Rides', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000030', 'Silver Star', 'Europa-Park', 'Germany', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000031', 'Schwur des Kärnan', 'Hansa-Park', 'Germany', 'Gerstlauer', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000032', 'Shambhala', 'PortAventura Park', 'Spain', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000033', 'Red Force', 'Ferrari Land', 'Spain', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000034', 'Dragon Khan', 'PortAventura Park', 'Spain', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000035', 'Helix', 'Liseberg', 'Sweden', 'Mack Rides', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000036', 'Balder', 'Liseberg', 'Sweden', 'Intamin', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000037', 'Valkyria', 'Liseberg', 'Sweden', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000038', 'Baron 1898', 'Efteling', 'Netherlands', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000039', 'Joris en de Draak', 'Efteling', 'Netherlands', 'Great Coasters International', 'Wooden'),
  ('c0a57e00-0000-4000-8000-000000000040', 'Untamed', 'Walibi Holland', 'Netherlands', 'Rocky Mountain Construction', 'Hybrid'),
  ('c0a57e00-0000-4000-8000-000000000041', 'Piraten', 'Djurs Sommerland', 'Denmark', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000042', 'Steel Dragon 2000', 'Nagashima Spa Land', 'Japan', 'Morgan', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000043', 'Eejanaika', 'Fuji-Q Highland', 'Japan', 'S&S Worldwide', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000044', 'Toutatis', 'Parc Astérix', 'France', 'Intamin', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000045', 'OzIris', 'Parc Astérix', 'France', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000046', 'Leviathan', 'Canada''s Wonderland', 'Canada', 'Bolliger & Mabillard', 'Steel'),
  ('c0a57e00-0000-4000-8000-000000000047', 'Yukon Striker', 'Canada''s Wonderland', 'Canada', 'Bolliger & Mabillard', 'Steel')
on conflict (id) do nothing;
