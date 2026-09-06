"use client";

import { useActionState, useEffect } from "react";
import {
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
  Typography,
} from "@/components/ui";
import {
  updateProfile,
  type UpdateProfileState,
} from "@/app/(app)/settings/actions";
import { useToast } from "@/components/toast/toast-provider";
import { SOCIAL_NETWORKS, SOCIAL_SPECS, type SocialLinks } from "@/lib/social";

const initialState: UpdateProfileState = { error: null, success: false };

export function SettingsForm({
  initialName,
  initialLinks,
}: {
  initialName: string;
  initialLinks: SocialLinks;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
      toast("Profile saved");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <Card className="mt-4">
      <Card.Header>
        <Card.Title>Profile</Card.Title>
        <Card.Description>How you appear across the app.</Card.Description>
      </Card.Header>

      <Card.Content>
        <Form action={formAction} className="flex flex-col gap-4">
          <TextField
            fullWidth
            isRequired
            name="name"
            defaultValue={initialName}
            isInvalid={Boolean(state.error)}
          >
            <Label>Name</Label>
            <Input variant="secondary" />
          </TextField>

          <Typography type="body-xs" color="muted">
            Add the profiles you want on your networking card. All optional —
            your card shows only what you fill in.
          </Typography>

          {SOCIAL_NETWORKS.map((network) => (
            <TextField
              key={network}
              fullWidth
              name={network}
              defaultValue={initialLinks[network] ?? ""}
              isInvalid={Boolean(state.error)}
            >
              <Label>{SOCIAL_SPECS[network].label}</Label>
              <Input
                variant="secondary"
                placeholder={SOCIAL_SPECS[network].placeholder}
              />
            </TextField>
          ))}

          <FieldError>{state.error}</FieldError>

          <Button type="submit" fullWidth isPending={pending}>
            Save changes
          </Button>
        </Form>
      </Card.Content>
    </Card>
  );
}
