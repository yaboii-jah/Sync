-- Remove temporary diagnostic RPCs used while debugging the webhook path.
-- The secret mismatch they exposed is resolved; private.app_secrets remains
-- the single source of truth for the send-push shared secret.

drop function if exists public.debug_webhook_responses();
drop function if exists public.debug_push_webhook_secret();
