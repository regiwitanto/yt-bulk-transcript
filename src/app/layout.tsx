import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_DESCRIPTION =
  "Extract transcripts from entire YouTube playlists in bulk. Get every video as clean text in one file. Free, fast, and no API key needed.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://yt-bulk-transcript.vercel.app",
  ),
  title: "YouTube Bulk Transcript",
  description: APP_DESCRIPTION,
  openGraph: {
    title: "YouTube Bulk Transcript",
    description: APP_DESCRIPTION,
    type: "website",
    siteName: "YouTube Bulk Transcript",
  },
  twitter: {
    card: "summary",
    title: "YouTube Bulk Transcript",
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%23000'/><rect x='22' y='30' width='56' height='8' rx='4' fill='white'/><rect x='22' y='46' width='56' height='8' rx='4' fill='white'/><rect x='22' y='62' width='36' height='8' rx='4' fill='white'/></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
