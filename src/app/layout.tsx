import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RazorpayTopNav } from "@/components/global/RazorpayTopNav";
import { ToastProvider } from "@/components/global/Toast";
import { StoreProvider } from "@/lib/store";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "UsageLeak · RAY AI · Razorpay Dashboard (prototype)",
  description: "UsageLeak — AI Revenue Assurance Agent. Find revenue you've earned but never billed. Prototype with synthetic data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <StoreProvider>
          <ToastProvider>
            <RazorpayTopNav />
            <main className="mx-2.5 min-h-[calc(100vh-64px)] overflow-clip rounded-t-xl bg-page">{children}</main>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
