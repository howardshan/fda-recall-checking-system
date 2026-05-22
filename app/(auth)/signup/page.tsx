import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { GoogleButton } from "@/components/auth/GoogleButton";

export const metadata = {
  title: "Create Account | SafeTrack",
};

export default function SignupPage() {
  return (
    <>
      <div className="mb-gutter text-center">
        <h1 className="font-display text-headline-md text-primary mb-2">Create your account</h1>
        <p className="text-body-md text-on-surface-variant">
          Get email alerts when the FDA recalls medications in your cabinet.
        </p>
      </div>

      <div className="card p-8 md:p-10">
        <SignupForm />

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-primary/10" />
          <span className="text-label-sm text-on-surface-variant">or</span>
          <div className="h-px flex-1 bg-primary/10" />
        </div>

        <GoogleButton label="Sign up with Google" />

        <div className="mt-8 border-t border-primary/5 pt-6 text-center">
          <p className="text-body-md text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="text-secondary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
