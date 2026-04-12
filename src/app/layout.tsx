import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/layout/command-palette";
import { BottomNav } from "@/components/layout/bottom-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academics OS",
  description: "Your personal academic command center",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Academics OS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-3 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:top-2 focus:left-2"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <TopBar />
                <main id="main-content" className="flex-1 overflow-auto p-6 pb-16 md:pb-0">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
          <Toaster />
          <CommandPalette />
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
