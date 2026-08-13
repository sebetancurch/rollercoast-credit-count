import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { HOME_FOR_ROLE } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Sign up · Credit Count" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(HOME_FOR_ROLE[user.role]);

  return (
    <div className="cc-page">
      <AuthForm mode="signup" />
    </div>
  );
}
