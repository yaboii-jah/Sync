import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";
import { listPlatformFeedback } from "@/lib/supabase/queries/platform-admin";

export default async function PlatformFeedbackPage({ searchParams }: { searchParams: Promise<{ category?: string; cursorAt?: string; cursorId?: string }> }) {
  const query = await searchParams; const category = ["bug","usability","idea"].includes(query.category ?? "") ? query.category! : null; const { supabase } = await requirePlatformSuperAdmin(); const rows = await listPlatformFeedback(supabase, { category, cursorAt: query.cursorAt, cursorId: query.cursorId }); const feedback = rows.slice(0,25); const next = rows.length > 25 ? rows[24] : null;
  const nextParams = new URLSearchParams(); if (category) nextParams.set("category",category); if(next){nextParams.set("cursorAt",next.created_at);nextParams.set("cursorId",next.id);}
  return <div className="platform-frame py-10"><p className="platform-kicker">Platform signal</p><h1 className="platform-display mt-3">Feedback</h1><form className="mt-7 flex max-w-md gap-3"><select className="organizer-input flex-1" name="category" defaultValue={category ?? ""}><option value="">All categories</option><option value="bug">Bug</option><option value="usability">Usability</option><option value="idea">Idea</option></select><button className="platform-button">Filter</button></form>
    <ul className="mt-8 grid gap-4">{feedback.map((item) => <li key={item.id} className="platform-card"><div><p className="platform-kicker">{item.category}</p><p className="mt-3 whitespace-pre-wrap leading-7">{item.message}</p><p className="mt-4 text-sm text-muted">{item.user_name || "Unnamed user"} · {new Date(item.created_at).toLocaleString()}</p></div></li>)}</ul>{!feedback.length ? <p className="mt-8 text-muted">No feedback matches this category.</p> : null}{next ? <Link className="platform-button mt-7" href={`/super-admin/feedback?${nextParams}`}>Next page</Link> : null}
  </div>;
}
import Link from "next/link";
