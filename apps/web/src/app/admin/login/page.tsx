import { Suspense } from "react";
import { AdminLoginPage } from "../../../components/platform-admin/admin-login-page";

export const metadata = {
  title: "Admin Login | Salense",
};

export default function Page() {
  return (
    <Suspense>
      <AdminLoginPage />
    </Suspense>
  );
}
