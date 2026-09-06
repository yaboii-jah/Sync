"use client";

import { useState, useTransition } from "react";
import { AlertDialog, Button, Typography } from "@/components/ui";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(app)/home/actions";

interface SignOutButtonProps {
  variant?: "icon" | "labeled";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function SignOutButton({
  variant = "icon",
  isOpen,
  onOpenChange,
  hideTrigger = false,
}: SignOutButtonProps) {
  const [pending, startTransition] = useTransition();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  function confirmSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <AlertDialog>
      {!hideTrigger ? (
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
      ) : null}

      <AlertDialog.Backdrop
        isOpen={isControlled ? open : undefined}
        isDismissable={!pending}
        onOpenChange={isControlled ? setOpen : undefined}
      >
        <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Sign out">
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
                    onPress={() => {
                      close();
                      if (isControlled) setOpen(false);
                    }}
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
