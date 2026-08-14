import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Sign in · Credit Count" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(HOME_FOR_ROLE[user.role]);

  // The auth callback redirects here with a reason when a confirmation link is
  // expired, already used, or points somewhere not on the allow-list. Showing
  // it is the difference between "that link has expired" and a login page that
  // silently appears to have ignored you.
  const { error } = await searchParams;

  return (
    <div className="cc-page">
      <AuthForm mode="signin" notice={error} />
    </div>
  );
}
