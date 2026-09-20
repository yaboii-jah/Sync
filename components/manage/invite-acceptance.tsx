"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { acceptEventAdminInvitationAction, previewEventAdminInvitationAction } from "@/app/manage/actions";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Alert, Button, Card } from "@/components/ui";

type Preview = { status: string; name?: string; slug?: string; expiresAt?: string };

export function InviteAcceptance({ signedIn }: { signedIn: boolean }) {
  const [token] = useState(() => typeof window === "undefined" ? "" : window.location.hash.slice(1));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!token || !signedIn) return;
    startTransition(async () => setPreview(await previewEventAdminInvitationAction(token)));
  }, [signedIn, token]);

  if (!token && typeof window !== "undefined") return <InviteCard><Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Description>This invitation link is invalid or incomplete.</Alert.Description></Alert.Content></Alert></InviteCard>;
  if (!signedIn) return <InviteCard><p className="text-muted">Sign in with the exact email address that received this invitation.</p><div className="mt-6"><SignInButton next={token ? `/invite#${token}` : "/invite"} variant="platform" /></div></InviteCard>;
  if (pending && !preview) return <InviteCard><p className="text-muted">Checking invitation…</p></InviteCard>;
  const status = preview?.status ?? "invalid";
  if (status === "valid" && preview?.name) return <InviteCard><div className="flex items-center gap-3"><Shield className="size-7 text-accent" aria-hidden /><div><p className="platform-kicker">Event admin invitation</p><h1 className="mt-1 text-2xl font-semibold">{preview.name}</h1></div></div><p className="mt-5 leading-7 text-muted">You are about to become an event admin. You can manage content, but only the owner can manage the team or transfer ownership.</p><Button className="mt-6" isPending={pending} onPress={() => startTransition(async () => { const result = await acceptEventAdminInvitationAction(token, crypto.randomUUID()); if (result.error) return setError(result.error); router.replace(`/manage/${result.slug}/team`); })}>Accept invitation</Button>{error ? <Alert status="danger" className="mt-5"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}</InviteCard>;
  const message: Record<string, string> = { wrong_account: "Sign in with the exact verified email address that received this invitation.", expired: "This invitation has expired. Ask the event owner for a new link.", revoked: "This invitation was revoked by the event owner.", accepted: "This invitation was already accepted. Open the event from your event hub.", unavailable: "This event is no longer available for administration.", invalid: "This invitation link is invalid or has been replaced." };
  return <InviteCard><Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Description>{message[status] ?? message.invalid}</Alert.Description></Alert.Content></Alert></InviteCard>;
}

function InviteCard({ children }: { children: React.ReactNode }) {
  return <main className="platform-frame flex min-h-dvh items-center py-12"><Card className="mx-auto w-full max-w-xl" variant="secondary"><Card.Content>{children}</Card.Content></Card></main>;
}
