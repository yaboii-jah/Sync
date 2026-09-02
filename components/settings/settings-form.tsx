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
} from "@heroui/react";
import {
  updateProfile,
  type UpdateProfileState,
} from "@/app/(app)/settings/actions";
import { useToast } from "@/components/toast/toast-provider";

const initialState: UpdateProfileState = { error: null, success: false };

export function SettingsForm({
  initialName,
  initialUrl,
}: {
  initialName: string;
  initialUrl: string;
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

          <TextField
            fullWidth
            isRequired
            name="linkedin_url"
            type="url"
            defaultValue={initialUrl}
            isInvalid={Boolean(state.error)}
          >
            <Label>LinkedIn profile URL</Label>
            <Input
              variant="secondary"
              placeholder="https://linkedin.com/in/your-name"
            />
            <FieldError>{state.error}</FieldError>
          </TextField>

          <Button type="submit" fullWidth isPending={pending}>
            Save changes
          </Button>
        </Form>
      </Card.Content>
    </Card>
  );
}
