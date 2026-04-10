"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  if (pending) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sign out?</span>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
          onClick={async () => {
            await fetch("/api/auth/signout", { method: "POST" });
            window.location.href = "/login";
          }}
        >
          Yes
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() => setPending(false)}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      onClick={() => setPending(true)}
    >
      Sign Out
    </button>
  );
}
