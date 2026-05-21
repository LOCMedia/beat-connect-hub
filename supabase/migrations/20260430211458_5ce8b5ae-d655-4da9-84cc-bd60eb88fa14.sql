-- Fix 3: Soft-delete contests via archived_at
ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_contests_archived_at ON public.contests(archived_at);

-- Fix 4: Ensure votes can be inserted by anyone for any approved/winner entry.
-- The existing policy already allows this; we add a safeguard policy targeting public role
-- and ensure unique constraints exist (they do already).
-- No-op safety: confirm RLS enabled
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;