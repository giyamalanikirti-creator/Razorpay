import { Suspense } from "react";
import { Review } from "./Review";

export const metadata = { title: "Review · Acme Ltd · UsageLeak · Razorpay Dashboard" };

export default function ReviewPage() {
  return (
    <Suspense>
      <Review />
    </Suspense>
  );
}
