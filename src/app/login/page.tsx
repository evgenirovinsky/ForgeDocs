import { Suspense } from "react";
import {
  azureAdConfigured,
  credentialsLoginEnabled,
} from "@/server/auth-flags";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#f5f0e8,_#e7e5e4)] flex items-center px-4">
      <Suspense>
        <LoginForm
          azureEnabled={azureAdConfigured()}
          credentialsEnabled={credentialsLoginEnabled()}
        />
      </Suspense>
    </main>
  );
}
