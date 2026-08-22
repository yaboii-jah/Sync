import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("linkedin_url")
    .eq("id", user.id)
    .maybeSingle();

  const destination = profile?.linkedin_url ? "/home" : "/onboarding";

  return NextResponse.redirect(new URL(destination, origin));
}
