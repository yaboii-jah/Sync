import { MessageSquare } from "lucide-react";
import { Avatar, Card, Chip, Separator, Typography } from "@/components/ui/static";
import { EmptyState } from "@/components/empty-states";
import { formatRelativeTime } from "@/lib/format";
import { feedbackCategoryLabel } from "@/lib/feedback";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminFeedback,
  type AdminFeedback,
} from "@/lib/supabase/queries/feedback";

function FeedbackAvatar({ feedback }: { feedback: AdminFeedback }) {
  const name = feedback.attendee_name || "Unnamed attendee";

  return (
    <Avatar size="md">
      {feedback.attendee_photo_url ? (
        <Avatar.Image src={feedback.attendee_photo_url} alt="" />
      ) : null}
      <Avatar.Fallback>{name.charAt(0).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}

export default async function AdminFeedbackPage() {
  const supabase = await createClient();
  const feedback = await getAdminFeedback(supabase, 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <Typography.Heading level={1} className="text-2xl">
        App feedback
      </Typography.Heading>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Read-only feedback from attendees, newest first. The list shows the
        latest 100 submissions.
      </Typography>

      <Card className="mt-8 overflow-hidden p-0">
        {feedback.map((entry, index) => {
          const attendeeName = entry.attendee_name || "Unnamed attendee";

          return (
            <div key={entry.id}>
              {index > 0 ? <Separator /> : null}
              <article className="px-4 py-5 sm:px-5">
                <div className="flex items-start gap-3">
                  <FeedbackAvatar feedback={entry} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography type="body-sm" weight="semibold">
                        {attendeeName}
                      </Typography>
                      <Chip size="sm" variant="secondary">
                        {feedbackCategoryLabel(entry.category)}
                      </Chip>
                      <Typography type="body-xs" color="muted" className="sm:ml-auto">
                        <time dateTime={entry.created_at}>
                          {formatRelativeTime(entry.created_at)}
                        </time>
                      </Typography>
                    </div>
                    <Typography
                      type="body-sm"
                      className="mt-3 whitespace-pre-wrap break-words leading-6"
                    >
                      {entry.message}
                    </Typography>
                  </div>
                </div>
              </article>
            </div>
          );
        })}

        {feedback.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title="No feedback yet"
            description="Attendee submissions will appear here once they start sharing feedback."
          />
        ) : null}
      </Card>
    </div>
  );
}
