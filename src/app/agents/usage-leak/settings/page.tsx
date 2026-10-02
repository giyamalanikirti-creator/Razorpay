import { Suspense } from "react";
import { Settings } from "./Settings";

export const metadata = { title: "Settings · UsageLeak · Razorpay Dashboard" };

export default function SettingsPage() {
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}
