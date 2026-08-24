import type { Metadata } from "next";
import contentJson from "@/content/content.json";
import { PremiumThankYou } from "../_components/PremiumThankYou";

// The audit runs via after(); give the function room to finish.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Payment confirmed — Booking Leak",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  // Header and footer come from the free page's content, as they always have.
  return <PremiumThankYou variant="premium" sessionId={sessionId} content={contentJson} />;
}
