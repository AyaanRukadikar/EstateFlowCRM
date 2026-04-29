ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score integer,
  ADD COLUMN IF NOT EXISTS score_label text,
  ADD COLUMN IF NOT EXISTS score_reason text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS scored_at timestamptz;