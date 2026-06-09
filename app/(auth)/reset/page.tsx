import { ResetForm } from "@/components/auth/ResetForm";

export const metadata = {
  title: "Choose a New Password | SafeTrack",
};

export default function ResetPage() {
  return (
    <>
      <div className="mb-gutter text-center">
        <h1 className="font-display text-headline-md text-on-surface mb-2">Set a new password</h1>
        <p className="text-body-md text-on-surface-variant">
          Choose a password you don&apos;t use anywhere else.
        </p>
      </div>

      <div className="card p-8 md:p-10">
        <ResetForm />
      </div>
    </>
  );
}
