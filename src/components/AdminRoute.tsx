import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

interface Props {
  children: ReactNode;
  allow?: AppRole[];
}

export function AdminRoute({ children, allow = ["admin"] }: Props) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!role || !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
