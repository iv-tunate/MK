-- Add multi-date schedule support to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS service_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS schedule_mode text;

-- Backfill schedule from existing service_date (single entry, no time)
UPDATE public.order_items
SET service_schedule = jsonb_build_array(
      jsonb_build_object(
        'date', to_char(service_date AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
        'time', to_char(service_date AT TIME ZONE 'UTC', 'HH24:MI')
      )
    ),
    schedule_mode = 'single'
WHERE service_date IS NOT NULL
  AND (service_schedule IS NULL OR service_schedule = '[]'::jsonb);

-- Keep service_date populated with the earliest date in the schedule
-- so existing sort/cancellation logic keeps working.
CREATE OR REPLACE FUNCTION public.sync_order_item_service_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  first_date text;
  first_time text;
BEGIN
  IF new.service_schedule IS NOT NULL
     AND jsonb_typeof(new.service_schedule) = 'array'
     AND jsonb_array_length(new.service_schedule) > 0 THEN
    SELECT (elem->>'date'), coalesce(elem->>'time','00:00')
      INTO first_date, first_time
    FROM jsonb_array_elements(new.service_schedule) elem
    WHERE elem->>'date' IS NOT NULL
    ORDER BY (elem->>'date') ASC
    LIMIT 1;

    IF first_date IS NOT NULL THEN
      BEGIN
        new.service_date := (first_date || ' ' || first_time)::timestamptz;
      EXCEPTION WHEN others THEN
        -- ignore parse errors, keep existing value
        NULL;
      END;
    END IF;
  END IF;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS trg_sync_order_item_service_date ON public.order_items;
CREATE TRIGGER trg_sync_order_item_service_date
BEFORE INSERT OR UPDATE OF service_schedule ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_item_service_date();