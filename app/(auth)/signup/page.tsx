import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create Account | SafeTrack",
};

export default function SignupPage() {
  return (
    <>
      <div className="mb-gutter text-center">
        <h1 className="font-display text-headline-md text-on-surface mb-2">Create your account</h1>
        <p className="text-body-md text-on-surface-variant">
          Get email alerts when the FDA recalls medications in your cabinet.
        </p>
      </div>

      <div className="card p-8 md:p-10">
        <SignupForm />
      </div>
    </>
  );
}
