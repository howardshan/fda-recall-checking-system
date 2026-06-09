import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleButton } from "@/components/auth/GoogleButton";

export const metadata = {
  title: "Log In | SafeTrack",
};

export default function LoginPage() {
  return (
    <>
      <div className="mb-gutter text-center">
        <h1 className="font-display text-headline-md text-on-surface mb-2">Welcome back</h1>
        <p className="text-body-md text-on-surface-variant">
          Access your safety notifications and medicine cabinet.
        </p>
      </div>

      <div className="card p-8 md:p-10">
        <Suspense fallback={<div className="text-body-md text-on-surface-variant">Loading…</div>}>
          <LoginForm />
        </Suspense>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-primary/10" />
          <span className="text-label-sm text-on-surface-variant">or</span>
          <div className="h-px flex-1 bg-primary/10" />
        </div>

        <GoogleButton />

        <div className="mt-8 border-t border-primary/5 pt-6 text-center">
          <p className="mb-4 text-body-md text-on-surface-variant">New to SafeTrack?</p>
          <Link href="/signup" className="btn-secondary w-full">
            Create an account
          </Link>
        </div>
      </div>
    </>
  );
}
