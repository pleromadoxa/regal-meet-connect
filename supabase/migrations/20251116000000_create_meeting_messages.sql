create table if not exists "public"."meeting_messages" (
    "id" uuid not null default gen_random_uuid(),
    "meeting_id" text not null,
    "user_id" text not null,
    "user_name" text not null,
    "message" text not null,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."meeting_messages" enable row level security;

create policy "Enable all access for now"
on "public"."meeting_messages"
as permissive
for all
to public
using (true)
with check (true);
