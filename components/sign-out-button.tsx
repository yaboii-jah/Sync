"use client";

import { useTransition } from "react";
import { AlertDialog, Button, Typography } from "@heroui/react";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(app)/home/actions";

interface SignOutButtonProps {
  variant?: "icon" | "labeled";
}

export function SignOutButton({ variant = "icon" }: SignOutButtonProps) {
  const [pending, startTransition] = useTransition();

  function confirmSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <AlertDialog>
      <AlertDialog.Trigger>
        <span
          aria-label={variant === "icon" ? "Sign out" : undefined}
          className={
            variant === "icon"
              ? "button button--icon-only button--sm button--ghost"
              : "button button--full-width button--sm button--ghost justify-start"
          }
        >
          <LogOut className="size-5" aria-hidden />
          {variant === "labeled" ? "Sign out" : null}
        </span>
      </AlertDialog.Trigger>

      <AlertDialog.Backdrop isDismissable={!pending}>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            {({ close }) => (
              <>
                <AlertDialog.Header>
                  <AlertDialog.Heading>Sign out?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <Typography type="body-sm" color="muted">
                    You will need to sign in again to return.
                  </Typography>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    variant="secondary"
                    isDisabled={pending}
                    onPress={close}
                  >
                    Cancel
                  </Button>
                  <Button
                    isPending={pending}
                    onPress={confirmSignOut}
                  >
                    Confirm
                  </Button>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
