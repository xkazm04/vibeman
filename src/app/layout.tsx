import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackgroundPattern from "../components/BackgroundPattern";
import QueryProvider from "../components/QueryProvider";
import { ModalProvider } from "../contexts/ModalContext";
import { ErrorProvider } from "../contexts/ErrorContext";
import ContextOverview from "./coder/Context/ContextOverview/ContextOverview";
import TopBar from "../components/Navigation/TopBar";
import PageTransition from "../components/Navigation/PageTransition";
import ControlPanelProvider from "./features/Onboarding/ControlPanelProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeMan - Development Platform",
  description: "Advanced development tools with seamless navigation and modern UX",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BackgroundPattern />
        <QueryProvider>
          <ErrorProvider>
            <ModalProvider>
              <ControlPanelProvider>
                <TopBar />
                <PageTransition>
                  {children}
                </PageTransition>
                <ContextOverview />
              </ControlPanelProvider>
            </ModalProvider>
          </ErrorProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
