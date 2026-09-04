"use client";

import { useTransition } from "react";
import { AlertDialog, Button } from "@heroui/react";
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

      <AlertDialog.Backdrop>
        <AlertDialog.Container size="xs">
          <AlertDialog.Dialog>
            {({ close }) => (
              <>
                <AlertDialog.Header>
                  <AlertDialog.Icon>
                    <LogOut className="size-5" aria-hidden />
                  </AlertDialog.Icon>
                  <AlertDialog.Heading>Sign out?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  You will need to sign in again to return.
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    variant="secondary"
                    isDisabled={pending}
                    onPress={close}
                  >
                    Stay
                  </Button>
                  <Button
                    variant="danger"
                    isPending={pending}
                    onPress={confirmSignOut}
                  >
                    Sign out
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
