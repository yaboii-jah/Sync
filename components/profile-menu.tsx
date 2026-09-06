"use client";

import {
  Button as AriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { CircleUserRound, LogOut, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/static";
import { SignOutButton } from "@/components/sign-out-button";
import { useState } from "react";

const menuItemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition data-[focused]:bg-default";

interface ProfileMenuProps {
  name?: string | null;
  photoUrl?: string | null;
  isAdmin?: boolean;
  showName?: boolean;
  placement?: "bottom end" | "right bottom";
  className?: string;
}

export function ProfileMenu({
  name,
  photoUrl,
  isAdmin = false,
  showName = false,
  placement = "bottom end",
  className,
}: ProfileMenuProps) {
  const [signOutOpen, setSignOutOpen] = useState(false);
  const label = name?.trim() || "Account";

  return (
    <>
      <MenuTrigger>
        <AriaButton
          aria-label={showName ? undefined : "Open profile menu"}
          className={
            className ??
            "inline-flex items-center gap-2 rounded-full p-1 text-foreground outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-focus"
          }
        >
          <Avatar size="sm">
            {photoUrl ? <Avatar.Image src={photoUrl} alt="" /> : null}
            <Avatar.Fallback>{label.charAt(0).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          {showName ? <span className="truncate text-sm">{label}</span> : null}
        </AriaButton>
        <Popover
          placement={placement}
          offset={8}
          className="min-w-56 rounded-2xl border border-border bg-overlay p-1 text-foreground shadow-overlay outline-none"
        >
          <Menu aria-label="Profile options" className="outline-none">
            <MenuItem href="/settings" textValue="Account" className={menuItemClass}>
              <CircleUserRound className="size-4 text-muted" aria-hidden />
              Account
            </MenuItem>
            {isAdmin ? (
              <MenuItem href="/admin" textValue="Admin" className={menuItemClass}>
                <ShieldCheck className="size-4 text-muted" aria-hidden />
                Admin
              </MenuItem>
            ) : null}
            <MenuItem
              textValue="Sign out"
              className={menuItemClass}
              onAction={() => setSignOutOpen(true)}
            >
              <LogOut className="size-4 text-muted" aria-hidden />
              Sign out
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>

      <SignOutButton
        hideTrigger
        isOpen={signOutOpen}
        onOpenChange={setSignOutOpen}
      />
    </>
  );
}
