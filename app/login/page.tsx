import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) qs.set(key, single);
  }

  const suffix = qs.toString();
  redirect(suffix ? `/?${suffix}` : "/");
}
