import { useState } from "react";
import { Menu, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button — visible only on small screens */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-card border-border shadow-md"
          onClick={() => setOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Backdrop + Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="relative w-60 h-full animate-slide-in-left">
            <AppSidebar onNavigate={() => setOpen(false)} />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
