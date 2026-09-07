"use client";

import { useActionState, useState } from "react";
import {
  Alert,
  Button,
  Description,
  FieldError,
  Form,
  Label,
  RadioGroup,
  TextArea,
  TextField,
  Typography,
} from "@/components/ui";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX_LENGTH,
} from "@/lib/feedback";
import {
  submitFeedback,
  type SubmitFeedbackState,
} from "@/app/(app)/more/feedback/actions";

const initialState: SubmitFeedbackState = {
  error: null,
  field: null,
  success: false,
  completedRequestId: null,
};

export function FeedbackForm({ initialRequestId }: { initialRequestId: string }) {
  const [state, formAction, pending] = useActionState(
    submitFeedback,
    initialState,
  );

  return (
    <div className="flex flex-col gap-4">
      {state.success ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Thanks for helping us improve Sync.</Alert.Title>
            <Alert.Description>
              Your feedback has been sent to the event team.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {state.error && !state.field ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{state.error}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}

      <FeedbackFields
        key={state.completedRequestId ?? "new-submission"}
        action={formAction}
        initialRequestId={state.completedRequestId ? undefined : initialRequestId}
        pending={pending}
        state={state}
      />
    </div>
  );
}

function FeedbackFields({
  action,
  initialRequestId,
  pending,
  state,
}: {
  action: (formData: FormData) => void;
  initialRequestId?: string;
  pending: boolean;
  state: SubmitFeedbackState;
}) {
  const [message, setMessage] = useState("");
  const [requestId] = useState(
    () => initialRequestId ?? crypto.randomUUID(),
  );

  return (
    <Form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="request_id" value={requestId} />

      <RadioGroup
        name="category"
        isRequired
        isInvalid={state.field === "category"}
        aria-label="Feedback category"
        className="flex flex-col gap-2"
      >
        <Label>What kind of feedback is this?</Label>
        <div className="flex flex-col gap-2">
          {FEEDBACK_CATEGORIES.map((category) => (
            <RadioGroup.Option key={category.value} value={category.value}>
              <RadioGroup.Control />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {category.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {category.description}
                </span>
              </span>
            </RadioGroup.Option>
          ))}
        </div>
        {state.field === "category" ? (
          <FieldError>{state.error}</FieldError>
        ) : null}
      </RadioGroup>

      <TextField
        name="message"
        isRequired
        isInvalid={state.field === "message"}
        className="gap-2"
      >
        <Label>Tell us what happened</Label>
        <TextArea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={7}
          maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
          placeholder="What should we know?"
        />
        <div className="flex items-start justify-between gap-3">
          <Description>Keep it specific and actionable if you can.</Description>
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {message.length.toLocaleString()} / {FEEDBACK_MESSAGE_MAX_LENGTH.toLocaleString()}
          </span>
        </div>
        <FieldError>{state.field === "message" ? state.error : null}</FieldError>
      </TextField>

      <Typography type="body-xs" color="muted">
        Your submission is identified with your Sync profile so the event team
        can understand who is sharing feedback. They will not see your email
        address here.
      </Typography>

      <Button type="submit" fullWidth isPending={pending}>
        Send feedback
      </Button>
    </Form>
  );
}
