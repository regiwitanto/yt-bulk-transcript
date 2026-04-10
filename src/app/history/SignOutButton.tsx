"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton() {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      onClick={async () => {
        if (!confirm("Sign out?")) return;
        await fetch("/api/auth/signout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      Sign Out
    </button>
  );
}
