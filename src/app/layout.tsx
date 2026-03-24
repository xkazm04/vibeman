import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import BackgroundPattern from "../components/ui/background/BackgroundPattern";
import QueryProvider from "../components/QueryProvider";
import { ModalProvider } from "../contexts/ModalContext";
import { ErrorProvider } from "../contexts/ErrorContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import TopBar from "../components/Navigation/TopBar";
import PageTransition from "../components/Navigation/PageTransition";
import ControlPanelProvider from "./features/Onboarding/ControlPanelProvider";
import DeferredWidgets from "../components/lazy/DeferredWidgets";
import { ToastContainer } from "../components/ui/Toast";
import UnifiedWorkflowProvider from "../components/UnifiedWorkflow/UnifiedWorkflowProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
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
            <ErrorBoundary>
              <ModalProvider>
                <ControlPanelProvider>
                  <UnifiedWorkflowProvider>
                    <TopBar />
                    <PageTransition>
                      {children}
                    </PageTransition>
                    <DeferredWidgets />
                    <ToastContainer position="top-right" />
                  </UnifiedWorkflowProvider>
                </ControlPanelProvider>
              </ModalProvider>
            </ErrorBoundary>
          </ErrorProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
