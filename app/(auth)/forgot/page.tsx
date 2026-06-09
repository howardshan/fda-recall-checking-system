import Link from "next/link";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata = {
  title: "Reset Password | SafeTrack",
};

export default function ForgotPage() {
  return (
    <>
      <div className="mb-gutter text-center">
        <h1 className="font-display text-headline-md text-on-surface mb-2">Reset your password</h1>
        <p className="text-body-md text-on-surface-variant">
          Enter the email on your account and we&apos;ll send you a reset link.
        </p>
      </div>

      <div className="card p-8 md:p-10">
        <ForgotForm />

        <div className="mt-8 border-t border-primary/5 pt-6 text-center">
          <Link href="/login" className="text-label-md text-secondary hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </>
  );
}
