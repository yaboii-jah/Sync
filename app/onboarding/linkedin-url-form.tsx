"use client";

import { useActionState } from "react";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { saveLinkedInUrl, type SaveLinkedInUrlState } from "./actions";

const initialState: SaveLinkedInUrlState = { error: null };

export function LinkedInUrlForm() {
  const [state, formAction, pending] = useActionState(
    saveLinkedInUrl,
    initialState,
  );

  return (
    <Form action={formAction} className="mt-6 flex flex-col gap-4">
      <TextField
        fullWidth
        isRequired
        name="linkedin_url"
        type="url"
        isInvalid={Boolean(state.error)}
      >
        <Label>Your LinkedIn profile URL</Label>
        <Input placeholder="https://linkedin.com/in/your-name" />
        <FieldError>{state.error}</FieldError>
      </TextField>

      <Button type="submit" fullWidth isPending={pending}>
        Save and continue
      </Button>
    </Form>
  );
}
