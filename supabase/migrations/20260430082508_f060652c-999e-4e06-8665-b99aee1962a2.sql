drop policy if exists "Public read previews" on storage.objects;

-- Allow public to read individual files in beat-audio-preview, but block listing the bucket root.
create policy "Public read preview files"
on storage.objects for select to public
using (
  bucket_id = 'beat-audio-preview'
  and (storage.foldername(name))[1] is not null
);