import { Suspense } from "react";
import { ResetPasswordForm } from "@/frontend/components/features/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  // useSearchParams() inside ResetPasswordForm needs a Suspense boundary
  // so the page can be statically prerendered at build time.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
