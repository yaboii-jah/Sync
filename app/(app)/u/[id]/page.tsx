import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Avatar, Card, Typography } from "@heroui/react";
import { ExternalLink, UserX } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-states";
import { getScanProfile } from "@/lib/supabase/queries/scan";
import { linkedInScanTarget } from "@/lib/linkedin";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import {
  primaryLinkClass,
  secondaryLinkClass,
} from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "Connection — Sync",
};

/**
 * Where a scanned networking QR lands.
 *
 * The QR encodes this route rather than a LinkedIn URL, which is what removes
 * the setup step entirely: `name` and `photo_url` both come from the LinkedIn
 * sign-in, so an attendee's card is complete the moment they first sign in and
 * there is nothing to type, paste or confirm.
 *
 * The card always identifies the person exactly — Sync knows whose id is in the
 * URL. Only the final hop to LinkedIn can be imprecise, and only for someone who
 * has never set a profile URL: `linkedInScanTarget` falls back to a name search
 * there. Anyone who has set one gets a direct profile link.
 *
 * Sign-in is required, so the reader is a fellow attendee rather than anyone who
 * happens to point a camera at a photo of the code.
 */
export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Gates on sign-in and gives the scanner their own nav shell.
  await requireCompleteProfile();

  const { id } = await params;
  const profile = await getScanProfile(id);

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-8 lg:pt-10">
        <AppHeader />

        {profile ? (
          <>
            <Typography type="body-sm" color="muted" className="mt-6">
              You met
            </Typography>

            <Card className="mt-2">
              <Card.Content className="flex flex-col items-center gap-4 py-8 text-center">
                <Avatar size="lg" className="size-24">
                  {profile.photo_url ? (
                    <Avatar.Image asChild src={profile.photo_url}>
                      <Image
                        src={profile.photo_url}
                        alt=""
                        width={96}
                        height={96}
                        unoptimized
                      />
                    </Avatar.Image>
                  ) : null}
                  <Avatar.Fallback>
                    {(profile.name || "?").charAt(0).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar>

                <Typography.Heading level={1} className="text-xl">
                  {profile.name || "Attendee"}
                </Typography.Heading>
              </Card.Content>

              <Card.Footer>
                <a
                  href={linkedInScanTarget(
                    profile.linkedin_url,
                    profile.name || "",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${primaryLinkClass} w-full`}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Connect on LinkedIn
                </a>
              </Card.Footer>
            </Card>
          </>
        ) : (
          <Card className="mt-6">
            <EmptyState
              icon={<UserX />}
              title="Card not found"
              description="That code does not match an attendee. Ask them to open Connect and show it again."
            />
          </Card>
        )}

        <div className="mt-6">
          <Link href="/home" className={`${secondaryLinkClass} w-full`}>
            Back to Sync
          </Link>
        </div>
      </div>
    </main>
  );
}
