import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Privacy Policy · YouTube Bulk Transcript",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 prose prose-sm dark:prose-invert">
        <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().getFullYear()}
        </p>

        <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              What we collect
            </h2>
            <p>
              When you sign in with Google, we store your email address to
              associate playlists and transcripts with your account. We do not
              store your Google password or any other personal data beyond your
              email.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              What we store
            </h2>
            <p>
              Playlist metadata (title, channel name, video IDs) and the
              resulting transcripts are stored in our database so you can
              access them later from your history. Single-video transcripts
              are not stored — they are returned directly to your browser.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Third-party services
            </h2>
            <p>
              We use Supabase for authentication and data storage, and Vercel
              for hosting. Transcripts are fetched from YouTube&apos;s public
              caption API. We do not sell your data to any third party.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Deleting your data
            </h2>
            <p>
              You can delete individual playlists and their transcripts from
              your history page at any time. To delete your account entirely,
              contact us.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          ← Back to home
        </Link>
      </footer>
    </div>
  );
}
