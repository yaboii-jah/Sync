"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDialog, Button, Chip, Skeleton, Typography } from "@/components/ui";
import { changeUserAdminAccess } from "@/app/(admin)/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { getAdminUserAccess } from "@/lib/supabase/queries/admin";
import type { AdminAccessRequest, AdminUserAccess } from "@/lib/admin-access";

export function AdminAccessControls({ userId, name, onBusyChange }: {
  userId: string;
  name: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const dialogId = useId();
  const [access, setAccess] = useState<AdminUserAccess | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [selection, setSelection] = useState<AdminAccessRequest | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);

  useEffect(() => {
    let current = true;
    void getAdminUserAccess(createClient(), userId).then((next) => {
      if (current) { setAccess(next); setLoadError(null); }
    }).catch(() => {
      if (current) setLoadError("Could not load admin access. Try again.");
    });
    return () => { current = false; };
  }, [userId, reload]);

  function openConfirmation(grantAdmin: boolean) {
    setSelection({ userId, grantAdmin, requestId: crypto.randomUUID() });
    setMutationError(null);
    setMessage(null);
  }

  function confirm() {
    if (!selection || submitting.current) return;
    const request = selection;
    submitting.current = true;
    onBusyChange(true);
    startTransition(async () => {
      try {
        const result = await changeUserAdminAccess(request);
        if (result.error || !result.access) {
          setMutationError(result.error ?? "Could not verify the access change.");
          return;
        }
        setAccess(result.access);
        setSelection(null);
        setMutationError(null);
        setMessage(result.access.is_admin === request.grantAdmin
          ? (request.grantAdmin ? "Admin access granted." : "Admin access removed. Their account is still active.")
          : "Access has changed since this request. The current role is shown below.");
        router.refresh();
      } catch {
        // Keep the request UUID for a retry after a lost response.
        setMutationError("Could not update admin access. Try again.");
      } finally {
        submitting.current = false;
        onBusyChange(false);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`admin-access-${userId}`}>
      <Typography.Heading level={2} id={`admin-access-${userId}`} className="text-sm">
        Admin access
      </Typography.Heading>
      {loadError ? (
        <Alert status="danger"><Alert.Content><Alert.Title>{loadError}</Alert.Title>
          <Button size="sm" variant="secondary" className="mt-2" onPress={() => { setLoadError(null); setReload((value) => value + 1); }}>Retry</Button>
        </Alert.Content></Alert>
      ) : access ? (
        <>
          <Chip variant="soft" color={access.is_admin ? "accent" : "default"}>
            {access.is_protected ? "Protected admin" : access.is_admin ? "Admin" : "Attendee"}
          </Chip>
          <Typography type="body-sm" color="muted">
            {access.is_protected ? "This admin’s access is protected."
              : access.is_self ? "You cannot remove your own admin access."
                : access.is_admin ? "This user can manage event operations and other unprotected admins."
                  : "Grant access to the admin workspace and event operations."}
          </Typography>
          {access.can_grant || access.can_revoke ? (
            <Button variant={access.can_revoke ? "outline" : "secondary"} className="self-start"
              isDisabled={pending} onPress={() => openConfirmation(access.can_grant)}>
              {access.can_grant ? "Make admin" : "Remove admin access"}
            </Button>
          ) : null}
        </>
      ) : <Skeleton className="h-10 w-full" />}
      {message ? <Typography role="status" type="body-sm">{message}</Typography> : null}

      <AlertDialog>
        <AlertDialog.Backdrop isOpen={selection !== null} isDismissable={!pending} isKeyboardDismissDisabled={pending}
          onOpenChange={(open) => { if (!open && !submitting.current) setSelection(null); }}>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog role="alertdialog" aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-description`}>
              <AlertDialog.Header>
                <AlertDialog.Heading id={`${dialogId}-title`}>{selection?.grantAdmin ? "Make this user an admin?" : "Remove admin access?"}</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="flex flex-col gap-3">
                <Typography type="body-sm" weight="semibold" className="break-words">{name}</Typography>
                <Typography type="body-sm" color="muted" id={`${dialogId}-description`}>
                  {selection?.grantAdmin
                    ? "They will be able to manage sessions, send attendee alerts, view attendee details, and grant or remove other users’ admin access."
                    : "They will lose access to event operations. Their account and attendee data will stay active."}
                </Typography>
                {mutationError ? <Alert status="danger"><Alert.Content><Alert.Title>{mutationError}</Alert.Title></Alert.Content></Alert> : null}
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="secondary" isDisabled={pending} onPress={() => setSelection(null)}>Cancel</Button>
                <Button variant={selection?.grantAdmin ? "primary" : "danger"} isPending={pending} onPress={confirm}>
                  {selection?.grantAdmin ? "Make admin" : "Remove access"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </section>
  );
}
