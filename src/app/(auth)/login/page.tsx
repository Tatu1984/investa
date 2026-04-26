import { Suspense } from "react";
import { LoginForm } from "@/frontend/components/features/auth/LoginForm";

export default function LoginPage() {
  // useSearchParams() inside LoginForm needs to be inside a Suspense boundary
  // so the page can be statically prerendered at build time.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
