import { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile nav drawer */}
      <MobileNav />

      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-14 lg:pt-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
