import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/query-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "The Archive",
  description: "A library management system, built with purpose",
};

// This component is a placeholder for any providers (e.g. ThemeProvider, AuthProvider) that we might want to add in the future. It doesn't do anything right now, but it keeps our layout clean and organized.
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <QueryProvider>
        <Toaster />
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </QueryProvider>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${roboto.variable} antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
