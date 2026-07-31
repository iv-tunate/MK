
-- 1) Default base prices
UPDATE public.services SET base_price_naira = 150000, price_per_day = false WHERE slug = 'security-detail';
UPDATE public.services SET base_price_naira = 200000, price_per_day = false WHERE slug = 'escort';
UPDATE public.services SET base_price_naira = 120000, price_per_day = true  WHERE slug = 'car-rental';
UPDATE public.services SET base_price_naira =  80000, price_per_day = false WHERE slug = 'bouncers';
UPDATE public.services SET base_price_naira =  35000, price_per_day = false WHERE slug = 'ushers';
UPDATE public.services SET base_price_naira =  60000, price_per_day = false WHERE slug = 'party-starters';
UPDATE public.services SET base_price_naira =  25000, price_per_day = false WHERE slug = 'money-guns';
UPDATE public.services SET base_price_naira =  90000, price_per_day = false WHERE slug = 'billboards';
UPDATE public.services SET base_price_naira = 120000, price_per_day = false WHERE slug = 'mascot-character';
UPDATE public.services SET base_price_naira = 250000, price_per_day = false WHERE slug = 'custom-costume';

-- 2) Helper: seed options for a given (service_slug, field_key) — replaces any existing rows.
DO $$
DECLARE
  rec RECORD;
  fid uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      -- service_slug, field_key, label, price_modifier_naira, stock, sort_order
      ('car-rental','vehicle_type','SUV (standard) — Toyota Highlander', 0,         null::int, 1),
      ('car-rental','vehicle_type','SUV (standard) — Lexus RX',          50000,     null,      2),
      ('car-rental','vehicle_type','SUV (armoured) — Mercedes G-Wagon',  450000,    null,      3),
      ('car-rental','vehicle_type','SUV (armoured) — Range Rover',       400000,    null,      4),
      ('car-rental','vehicle_type','Saloon — Toyota Camry',             -40000,     null,      5),
      ('car-rental','vehicle_type','Bus / Van — Toyota Hiace',           80000,     null,      6),
      ('car-rental','vehicle_type','Bus / Van — Coaster',                150000,    null,      7),

      ('mascot-character','character','Bumble Bee',  40000, 1, 1),
      ('mascot-character','character','Panda',       30000, 1, 2),
      ('mascot-character','character','Gorilla',     35000, 1, 3),
      ('mascot-character','character','Mario',       30000, 1, 4),
      ('mascot-character','character','Big Bear',    35000, 1, 5),
      ('mascot-character','character','Teddy Bear',  25000, 1, 6),
      ('mascot-character','character','Minions',     30000, 1, 7),
      ('mascot-character','character','Spider-Man',  35000, 1, 8),
      ('mascot-character','character','Elsa',        30000, 1, 9),
      ('mascot-character','character','Mickey Mouse',30000, 1,10),
      ('mascot-character','character','Mascot of choice — specify in notes', 0, null, 11),

      ('mascot-character','duration','1 hr',        0, null, 1),
      ('mascot-character','duration','2 hrs',   15000, null, 2),
      ('mascot-character','duration','3 hrs',   30000, null, 3),
      ('mascot-character','duration','4 hrs',   45000, null, 4),
      ('mascot-character','duration','Full day',90000, null, 5),

      ('ushers','gender','Mixed',         0, null, 1),
      ('ushers','gender','Female only',   0, null, 2),
      ('ushers','gender','Male only',     0, null, 3),
      ('ushers','duration','4 hrs',       0, null, 1),
      ('ushers','duration','6 hrs',  10000, null, 2),
      ('ushers','duration','8 hrs',  20000, null, 3),
      ('ushers','duration','Full event',30000, null, 4),

      ('party-starters','type','General hype crew',  0, null, 1),
      ('party-starters','type','MC / Host',      40000, null, 2),
      ('party-starters','type','Dancers',        25000, null, 3),
      ('party-starters','type','Comedian',       60000, null, 4),
      ('party-starters','duration','2 hrs',           0, null, 1),
      ('party-starters','duration','4 hrs',       30000, null, 2),
      ('party-starters','duration','Full event',  80000, null, 3),

      ('bouncers','duration','4 hrs',          0, null, 1),
      ('bouncers','duration','6 hrs',      20000, null, 2),
      ('bouncers','duration','8 hrs',      40000, null, 3),
      ('bouncers','duration','Full event', 60000, null, 4),

      ('security-detail','duration','Half day (4 hrs)',                0, null, 1),
      ('security-detail','duration','Full day (8 hrs)',            50000, null, 2),
      ('security-detail','duration','12 hours',                    90000, null, 3),
      ('security-detail','duration','24 hours',                   180000, null, 4),
      ('security-detail','duration','Weekend',                    300000, null, 5),
      ('security-detail','duration','Custom — specify in notes',       0, null, 6),

      ('car-rental','duration','1 day',         0, null, 1),
      ('car-rental','duration','2–3 days', 30000, null, 2),
      ('car-rental','duration','1 week',  150000, null, 3),
      ('car-rental','duration','2 weeks', 300000, null, 4),
      ('car-rental','duration','1 month', 600000, null, 5),
      ('car-rental','duration','Custom',       0, null, 6)
    ) AS t(service_slug, field_key, label, price_modifier_naira, stock, sort_order)
  LOOP
    SELECT sf.id INTO fid
      FROM public.service_fields sf
      JOIN public.services s ON s.id = sf.service_id
     WHERE s.slug = rec.service_slug AND sf.field_key = rec.field_key
     LIMIT 1;
    IF fid IS NULL THEN CONTINUE; END IF;

    -- Wipe and re-seed so we end up with a clean priced list.
    DELETE FROM public.service_field_options WHERE field_id = fid AND label = rec.label;
    INSERT INTO public.service_field_options (field_id, label, price_modifier_naira, stock, sort_order, is_active)
    VALUES (fid, rec.label, rec.price_modifier_naira, rec.stock, rec.sort_order, true);
  END LOOP;

  -- Drop the legacy text 'options' arrays for these fields so the UI uses the rich list.
  UPDATE public.service_fields sf
     SET options = NULL
   WHERE sf.kind = 'select'
     AND EXISTS (SELECT 1 FROM public.service_field_options o WHERE o.field_id = sf.id);
END $$;
