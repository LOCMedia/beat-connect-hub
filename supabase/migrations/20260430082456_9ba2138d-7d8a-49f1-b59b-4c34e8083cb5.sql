-- Private bucket for original/master files (paid download source)
insert into storage.buckets (id, name, public)
values ('beat-audio-raw', 'beat-audio-raw', false)
on conflict (id) do nothing;

-- Public bucket for watermarked preview audio
insert into storage.buckets (id, name, public)
values ('beat-audio-preview', 'beat-audio-preview', true)
on conflict (id) do nothing;

-- Admin-only RLS for beat-audio-raw
create policy "Admins read raw beats"
on storage.objects for select to authenticated
using (bucket_id = 'beat-audio-raw' and public.has_role(auth.uid(), 'admin'));

create policy "Admins write raw beats"
on storage.objects for insert to authenticated
with check (bucket_id = 'beat-audio-raw' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update raw beats"
on storage.objects for update to authenticated
using (bucket_id = 'beat-audio-raw' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete raw beats"
on storage.objects for delete to authenticated
using (bucket_id = 'beat-audio-raw' and public.has_role(auth.uid(), 'admin'));

-- Public read on watermarked previews; admin writes
create policy "Public read previews"
on storage.objects for select to public
using (bucket_id = 'beat-audio-preview');

create policy "Admins write previews"
on storage.objects for insert to authenticated
with check (bucket_id = 'beat-audio-preview' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update previews"
on storage.objects for update to authenticated
using (bucket_id = 'beat-audio-preview' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete previews"
on storage.objects for delete to authenticated
using (bucket_id = 'beat-audio-preview' and public.has_role(auth.uid(), 'admin'));

-- Track watermarked preview URL on beats
alter table public.beats
add column if not exists preview_audio_url text;