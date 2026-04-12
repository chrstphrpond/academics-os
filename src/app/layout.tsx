import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/layout/command-palette";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academics OS",
  description: "Your personal academic command center",
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
                <main className="flex-1 overflow-auto p-6">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
          <Toaster />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
