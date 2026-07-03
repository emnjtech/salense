import type { ReactNode } from "react";
import { AuthenticatedNavigation } from "../../components/layout/authenticated-navigation";

interface AuthenticatedLayoutProps {
  readonly children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="app-shell">
      <AuthenticatedNavigation />
      <div className="workspace-frame">{children}</div>
    </div>
  );
}
