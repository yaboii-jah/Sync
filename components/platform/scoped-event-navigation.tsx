import Link from "next/link";
import { eventAlertsPath, eventConnectPath, eventFeedbackPath, eventHomePath, eventPhotoBoothPath, eventSettingsPath } from "@/lib/events/routing";

export function ScopedEventNavigation({ slug }: { slug: string }) {
  return <nav aria-label="Event navigation" className="mb-8 flex flex-wrap gap-5 border-b pb-4 platform-rule text-sm">
    <Link className="platform-link" href={eventHomePath(slug)}>Home</Link>
    <Link className="platform-link" href={eventAlertsPath(slug)}>Alerts</Link>
    <Link className="platform-link" href={eventConnectPath(slug)}>Connect</Link>
    <Link className="platform-link" href={eventFeedbackPath(slug)}>Feedback</Link>
    <Link className="platform-link" href={eventPhotoBoothPath(slug)}>Photo Booth</Link>
    <Link className="platform-link" href={eventSettingsPath(slug)}>Notification settings</Link>
    <Link className="platform-link" href="/events">All events</Link>
  </nav>;
}
