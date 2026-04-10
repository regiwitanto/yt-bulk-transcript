"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={signingOut}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      onClick={async () => {
        setSigningOut(true);
        await fetch("/api/auth/signout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      {signingOut ? "Signing out…" : "Sign Out"}
    </button>
  );
}
