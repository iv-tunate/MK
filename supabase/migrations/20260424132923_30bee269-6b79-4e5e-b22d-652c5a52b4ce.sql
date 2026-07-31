
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.generate_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'MK-' || to_char(now(),'YYYYMMDD') || '-' ||
                        upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  end if;
  return new;
end $$;
