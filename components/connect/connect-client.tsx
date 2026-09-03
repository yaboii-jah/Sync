"use client";

import { useState, useTransition } from "react";
import { setNetworkingCardPublished } from "@/app/(app)/connect/actions";
import { useToast } from "@/components/toast/toast-provider";
import { SOCIAL_NETWORKS, type SocialLinks } from "@/lib/social";
import { ConnectCard } from "./connect-card";

interface ConnectClientProps {
  cardUrl: string;
  initialIsPublic: boolean;
  initialLinks: SocialLinks;
}

export function ConnectClient({
  cardUrl,
  initialIsPublic,
  initialLinks,
}: ConnectClientProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publishPending, startPublishTransition] = useTransition();
  const { toast } = useToast();

  const configuredNetworks = SOCIAL_NETWORKS.filter(
    (network) => initialLinks[network],
  );
  const hasSavedLinks = configuredNetworks.length > 0;

  function changePublication(published: boolean) {
    startPublishTransition(async () => {
      const result = await setNetworkingCardPublished(published, isPublic);
      setIsPublic(result.isPublic);
      if (result.error) {
        toast(result.error, "error");
        return;
      }

      toast(result.isPublic ? "Your card is now shared" : "Your card is private");
    });
  }

  return (
    <ConnectCard
      configuredNetworks={configuredNetworks}
      cardUrl={cardUrl}
      isPublic={isPublic}
      publishPending={publishPending}
      hasSavedLinks={hasSavedLinks}
      onPublicationChange={changePublication}
    />
  );
}
