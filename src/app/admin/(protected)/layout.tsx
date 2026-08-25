import { requireAdmin } from "@/lib/auth/dal";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  if (user.user_metadata?.must_change_password) {
    return (
      <div className="min-h-screen bg-surface text-content">
        <ChangePasswordForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-content md:flex">
      <AdminNav email={user.email} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
