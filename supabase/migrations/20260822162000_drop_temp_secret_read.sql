-- Remove the temporary webhook-secret read RPC from the smart-notifications
-- debugging round. private.app_secrets remains the single source of truth.

drop function if exists public.debug_push_webhook_secret();
