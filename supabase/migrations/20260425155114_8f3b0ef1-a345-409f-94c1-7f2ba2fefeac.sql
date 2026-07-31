-- =========================================================
-- CATALOG: categories, services, service_fields, service_photos
-- =========================================================

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text not null default '',
  accent_hsl  text not null default '45 65% 52%',
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories(id) on delete cascade,
  slug         text not null unique,
  name         text not null,
  icon         text not null default '✨',
  description  text not null default '',
  info         text not null default '',
  sort_order   int  not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index services_category_idx on public.services(category_id);

create type public.field_kind as enum ('qty','text','select','checkbox','datetime');

create table public.service_fields (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.services(id) on delete cascade,
  kind         public.field_kind not null,
  field_key    text not null,
  label        text not null,
  placeholder  text,
  info         text,
  required     boolean not null default false,
  default_num  int,
  min_num      int,
  max_num      int,
  options      text[],
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  unique (service_id, field_key)
);
create index service_fields_service_idx on public.service_fields(service_id);

create table public.service_photos (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references public.services(id) on delete cascade,
  storage_path  text not null,
  is_primary    boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index service_photos_service_idx on public.service_photos(service_id);

create or replace function public.enforce_photo_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.service_photos where service_id = new.service_id) >= 5 then
    raise exception 'A service can have at most 5 photos';
  end if;
  return new;
end $$;

create trigger service_photos_cap
before insert on public.service_photos
for each row execute function public.enforce_photo_cap();

create trigger touch_categories before update on public.categories
for each row execute function public.touch_updated_at();

create trigger touch_services before update on public.services
for each row execute function public.touch_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table public.categories     enable row level security;
alter table public.services       enable row level security;
alter table public.service_fields enable row level security;
alter table public.service_photos enable row level security;

create policy "categories public read" on public.categories
  for select using (is_active = true or has_role(auth.uid(),'admin'));

create policy "services public read" on public.services
  for select using (is_active = true or has_role(auth.uid(),'admin'));

create policy "service_fields public read" on public.service_fields
  for select using (
    exists (select 1 from public.services s
            where s.id = service_fields.service_id
              and (s.is_active = true or has_role(auth.uid(),'admin')))
  );

create policy "service_photos public read" on public.service_photos
  for select using (
    exists (select 1 from public.services s
            where s.id = service_photos.service_id
              and (s.is_active = true or has_role(auth.uid(),'admin')))
  );

create policy "categories admin write" on public.categories
  for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create policy "services admin write" on public.services
  for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create policy "service_fields admin write" on public.service_fields
  for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create policy "service_photos admin write" on public.service_photos
  for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

-- =========================================================
-- order_items.category becomes plain text (snapshot)
-- =========================================================
alter table public.order_items alter column category type text using category::text;

-- =========================================================
-- STORAGE bucket
-- =========================================================
insert into storage.buckets (id, name, public)
values ('service-photos','service-photos', true)
on conflict (id) do nothing;

create policy "service-photos public read" on storage.objects
  for select using (bucket_id = 'service-photos');

create policy "service-photos admin insert" on storage.objects
  for insert with check (bucket_id = 'service-photos' and has_role(auth.uid(),'admin'));

create policy "service-photos admin update" on storage.objects
  for update using (bucket_id = 'service-photos' and has_role(auth.uid(),'admin'));

create policy "service-photos admin delete" on storage.objects
  for delete using (bucket_id = 'service-photos' and has_role(auth.uid(),'admin'));

-- =========================================================
-- SEED
-- =========================================================
with cat_guards as (
  insert into public.categories (slug,name,tagline,accent_hsl,sort_order)
  values ('guards','MK Guards','Security Services','45 65% 52%',1) returning id
),
cat_events as (
  insert into public.categories (slug,name,tagline,accent_hsl,sort_order)
  values ('events','MK Events','Event Services','190 70% 50%',2) returning id
),
cat_mascots as (
  insert into public.categories (slug,name,tagline,accent_hsl,sort_order)
  values ('mascots','MK Mascots','Mascot Hire','320 70% 60%',3) returning id
),
s_security as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'security-detail','Private Security Detail','🛡️','Personal or corporate security, armed or unarmed.',
    'Trained guards for residences, offices, executives or VIPs. Choose number of guards, armed/unarmed, and whether to include K9 dogs.',1
  from cat_guards returning id
),
s_escort as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'escort','Escort Service','🚗','Armed convoy and VIP escort with vehicles.',
    'Vehicle-based escort from point A to point B. Useful for VIP transit, valuables, or high-risk movement.',2
  from cat_guards returning id
),
s_carrental as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'car-rental','Car Rental','🔑','Security-grade vehicles available for hire.',
    'Standard or armoured vehicles. Driver optional.',3
  from cat_guards returning id
),
s_bouncers as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'bouncers','Event Bouncers','🏛️','Crowd control and door management for events.',
    'Professional bouncers for clubs, parties, weddings, corporate events.',4
  from cat_guards returning id
),
s_ushers as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'ushers','Ushers','💁','Professional ushers for corporate and private events.',
    'Trained, well-dressed ushers for guest reception, programme assistance, and protocol.',1
  from cat_events returning id
),
s_party as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'party-starters','Party Starters','🎉','Hosts and entertainers to energize your event.',
    'Hype crew, MCs, dancers and comedians.',2
  from cat_events returning id
),
s_money as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'money-guns','Money Spraying Guns','💸','Cash spraying guns for owambe & celebrations.',
    'We supply the spraying guns; cash is yours. We can also supply operators.',3
  from cat_events returning id
),
s_billboards as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'billboards','Party Billboards','📢','Walking ads and branded human billboards.',
    'Human billboards walking the venue with branded content.',4
  from cat_events returning id
),
s_char as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'mascot-character','Character Mascot','🐻','Mickey, Minions, Spider-Man, Elsa & more.',
    'Character mascots for kids'' parties, brand activations, store openings.',1
  from cat_mascots returning id
),
s_costume as (
  insert into public.services (category_id,slug,name,icon,description,info,sort_order)
  select id,'custom-costume','Custom Costume','🎭','Branded mascot suits for activations & launches.',
    'Custom-fabricated mascot suits matching your brand. Lead time required — admin will confirm on WhatsApp.',2
  from cat_mascots returning id
)
insert into public.service_fields (service_id,kind,field_key,label,placeholder,info,required,default_num,min_num,options,sort_order)
-- security-detail
select id,'qty'::field_kind,'guards','Number of guards',null::text,'How many guards do you need on duty at the same time?',false,2,1,null::text[],1 from s_security
union all select id,'text','location','Location / Address','e.g. 12 Akin Adesola, Victoria Island, Lagos','Full address where guards should report.',true,null,null,null::text[],2 from s_security
union all select id,'datetime','service_date','Start date & time',null,'When should guards begin duty?',true,null,null,null::text[],3 from s_security
union all select id,'select','duration','Duration',null,'How long do you need this service for?',false,null,null,
  array['Half day (4 hrs)','Full day (8 hrs)','12 hours','24 hours','Weekend','Custom — specify in notes']::text[],4 from s_security
union all select id,'checkbox','armed','Armed guards',null,'Armed guards require regulatory clearance and may take longer to deploy.',false,null,null,null::text[],5 from s_security
union all select id,'checkbox','dogs','Include security dogs (K9)',null,'Trained handlers + K9 units for high-risk venues.',false,null,null,null::text[],6 from s_security
-- escort
union all select id,'qty','vehicles','Number of escort vehicles',null,null,false,1,1,null::text[],1 from s_escort
union all select id,'text','pickup','Pickup location','From...',null,true,null,null,null::text[],2 from s_escort
union all select id,'text','destination','Destination','To...','Final drop-off address.',true,null,null,null::text[],3 from s_escort
union all select id,'datetime','service_date','Pickup date & time',null,null,true,null,null,null::text[],4 from s_escort
union all select id,'checkbox','armed','Armed escort',null,'Armed personnel accompany the convoy.',false,null,null,null::text[],5 from s_escort
-- car-rental
union all select id,'qty','vehicles','Number of vehicles',null,null,false,1,1,null::text[],1 from s_carrental
union all select id,'select','vehicle_type','Vehicle type',null,null,false,null,null,
  array['SUV (armoured)','SUV (standard)','Saloon','Bus / Van']::text[],2 from s_carrental
union all select id,'text','location','Pickup location','Pickup address',null,true,null,null,null::text[],3 from s_carrental
union all select id,'datetime','service_date','Pickup date & time',null,null,true,null,null,null::text[],4 from s_carrental
union all select id,'select','duration','Rental duration',null,null,false,null,null,
  array['1 day','2–3 days','1 week','2 weeks','1 month','Custom']::text[],5 from s_carrental
union all select id,'checkbox','driver','Include driver',null,'Professional driver included for the rental period.',false,null,null,null::text[],6 from s_carrental
-- bouncers
union all select id,'qty','bouncers','Number of bouncers',null,null,false,3,1,null::text[],1 from s_bouncers
union all select id,'text','location','Venue address',null,null,true,null,null,null::text[],2 from s_bouncers
union all select id,'datetime','service_date','Event date & time',null,null,true,null,null,null::text[],3 from s_bouncers
union all select id,'select','duration','Duration',null,null,false,null,null,
  array['4 hrs','6 hrs','8 hrs','Full event']::text[],4 from s_bouncers
-- ushers
union all select id,'qty','ushers','Number of ushers',null,null,false,4,1,null::text[],1 from s_ushers
union all select id,'select','gender','Gender preference',null,null,false,null,null,
  array['Mixed','Female only','Male only']::text[],2 from s_ushers
union all select id,'text','location','Venue address',null,null,true,null,null,null::text[],3 from s_ushers
union all select id,'datetime','service_date','Event date & time',null,null,true,null,null,null::text[],4 from s_ushers
union all select id,'select','duration','Duration',null,null,false,null,null,
  array['4 hrs','6 hrs','8 hrs','Full event']::text[],5 from s_ushers
-- party-starters
union all select id,'qty','performers','Number required',null,null,false,2,1,null::text[],1 from s_party
union all select id,'select','type','Type',null,null,false,null,null,
  array['General hype crew','MC / Host','Dancers','Comedian']::text[],2 from s_party
union all select id,'text','location','Venue address',null,null,true,null,null,null::text[],3 from s_party
union all select id,'datetime','service_date','Event date & time',null,null,true,null,null,null::text[],4 from s_party
union all select id,'select','duration','Duration',null,null,false,null,null,
  array['2 hrs','4 hrs','Full event']::text[],5 from s_party
-- money-guns
union all select id,'qty','guns','Number of guns',null,null,false,2,1,null::text[],1 from s_money
union all select id,'checkbox','operator','Include trained operator(s)',null,null,false,null,null,null::text[],2 from s_money
union all select id,'text','location','Venue address',null,null,true,null,null,null::text[],3 from s_money
union all select id,'datetime','service_date','Event date & time',null,null,true,null,null,null::text[],4 from s_money
-- billboards
union all select id,'qty','billboards','Number required',null,null,false,2,1,null::text[],1 from s_billboards
union all select id,'text','location','Venue address',null,null,true,null,null,null::text[],2 from s_billboards
union all select id,'datetime','service_date','Event date & time',null,null,true,null,null,null::text[],3 from s_billboards
-- mascot-character
union all select id,'qty','mascots','Number of mascots',null,null,false,1,1,null::text[],1 from s_char
union all select id,'select','character','Character',null,null,false,null,null,
  array['Mickey Mouse','Minnie Mouse','Minions','Spider-Man','Elsa','Mascot of choice — specify in notes']::text[],2 from s_char
union all select id,'text','location','Venue address',null,null,true,null,null,null::text[],3 from s_char
union all select id,'datetime','service_date','Date & time',null,null,true,null,null,null::text[],4 from s_char
union all select id,'select','duration','Duration',null,null,false,null,null,
  array['1 hr','2 hrs','3 hrs','4 hrs','Full day']::text[],5 from s_char
-- custom-costume
union all select id,'qty','costumes','Number of costumes',null,null,false,1,1,null::text[],1 from s_costume
union all select id,'text','location','Delivery / event address',null,null,true,null,null,null::text[],2 from s_costume
union all select id,'datetime','service_date','Needed by date',null,null,true,null,null,null::text[],3 from s_costume;