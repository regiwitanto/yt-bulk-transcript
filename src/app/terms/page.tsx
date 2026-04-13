import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Terms of Service · YouTube Bulk Transcript",
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <h1 className="text-2xl font-bold mb-1">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().getFullYear()}
        </p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Use at your own risk
            </h2>
            <p>
              YouTube Bulk Transcript is provided &quot;as is&quot; without any
              warranty. We make no guarantees about uptime, accuracy of
              transcripts, or continued availability of the service.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Acceptable use
            </h2>
            <p>
              You may use this service to extract transcripts from publicly
              available YouTube videos and playlists for personal, research, or
              non-commercial purposes. Do not use this service to systematically
              scrape or archive content at scale in ways that harm YouTube or
              content creators.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              YouTube&apos;s terms
            </h2>
            <p>
              Transcripts are fetched from YouTube&apos;s public caption
              system. You are responsible for ensuring your use of the content
              you download complies with YouTube&apos;s{" "}
              <a
                href="https://www.youtube.com/static?template=terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Terms of Service
              </a>{" "}
              and applicable copyright law.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Changes to these terms
            </h2>
            <p>
              We may update these terms at any time. Continued use of the
              service after changes constitutes acceptance.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          ← Back to home
        </Link>
      </footer>
    </div>
  );
}
