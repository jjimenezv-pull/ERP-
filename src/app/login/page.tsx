import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/auth/get-current-profile";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  const user = await getVerifiedUser();
  if (user) {
    redirect("/casos");
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <LoginForm />
    </div>
  );
}
