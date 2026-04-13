import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity",
        className,
      )}
    >
      {/* Play-button icon mark */}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-600 shadow-sm"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 translate-x-[1px]"
          fill="white"
        >
          <path d="M5 3.5l8 4.5-8 4.5V3.5z" />
        </svg>
      </span>
      <span>YouTube Bulk Transcript</span>
    </Link>
  );
}
