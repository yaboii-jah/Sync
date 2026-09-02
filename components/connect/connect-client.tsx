"use client";

import { useActionState, useEffect, useState } from "react";
import { ListBox, Select } from "@heroui/react";
import { ConnectCard } from "./connect-card";
import { saveSocialProfile, type SaveSocialProfileState } from "@/app/(app)/connect/actions";
import { useToast } from "@/components/toast/toast-provider";
import {
  PLATFORM_LIST,
  type SocialPlatform,
  type PlatformConfig,
} from "@/lib/platforms";

interface PlatformState {
  url: string;
  qrValue: string | null;
}

function buildInitialPlatformState(savedUrls: Partial<Record<SocialPlatform, string>>): Record<SocialPlatform, PlatformState> {
  return {
    linkedin: { url: savedUrls.linkedin ?? "", qrValue: savedUrls.linkedin ?? null },
    instagram: { url: savedUrls.instagram ?? "", qrValue: savedUrls.instagram ?? null },
    facebook: { url: savedUrls.facebook ?? "", qrValue: savedUrls.facebook ?? null },
  };
}

interface ConnectClientProps {
  name: string;
  photoUrl: string | null;
  savedUrls: Partial<Record<SocialPlatform, string>>;
}

const initialState: SaveSocialProfileState = { error: null, success: false };

export function ConnectClient({ name, photoUrl, savedUrls }: ConnectClientProps) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<SocialPlatform>("linkedin");
  const [platformState, setPlatformState] = useState(() =>
    buildInitialPlatformState(savedUrls),
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveSocialProfile,
    initialState,
  );
  const { toast } = useToast();

  useEffect(() => {
    if (saveState.success) {
      toast("Profile saved");
    } else if (saveState.error) {
      toast(saveState.error);
    }
  }, [saveState.success, saveState.error, toast]);

  const currentPlatform = PLATFORM_LIST.find(
    (p) => p.id === selectedPlatform,
  ) as PlatformConfig;
  const currentState = platformState[selectedPlatform];

  function handleUrlChange(url: string) {
    setPlatformState((prev) => ({
      ...prev,
      [selectedPlatform]: { ...prev[selectedPlatform], url },
    }));
  }

  function handleGenerateQr() {
    const url = platformState[selectedPlatform].url.trim();
    if (!url) return;
    setPlatformState((prev) => ({
      ...prev,
      [selectedPlatform]: { ...prev[selectedPlatform], qrValue: url },
    }));
    const formData = new FormData();
    formData.set("network", selectedPlatform);
    formData.set("url", url);
    saveAction(formData);
  }

  return (
    <div className="flex flex-col gap-6">
      <Select
        selectedKey={selectedPlatform}
        onSelectionChange={(key) => setSelectedPlatform(key as SocialPlatform)}
      >
        <Select.Trigger className="w-full">
          <Select.Value />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="linkedin">LinkedIn</ListBox.Item>
            <ListBox.Item id="instagram">Instagram</ListBox.Item>
            <ListBox.Item id="facebook">Facebook</ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>

      <ConnectCard
        name={name}
        photoUrl={photoUrl}
        platform={currentPlatform}
        url={currentState.url}
        onUrlChange={handleUrlChange}
        qrValue={currentState.qrValue}
        onGenerateQr={handleGenerateQr}
        isSaving={savePending}
      />
    </div>
  );
}