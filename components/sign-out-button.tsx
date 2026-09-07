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
                ? "inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
                : "inline-flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted whitespace-nowrap transition-colors hover:bg-default hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
            }
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
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
