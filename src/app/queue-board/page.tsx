import type { Metadata } from "next";
import { QueueBoard } from "./QueueBoard";

export const metadata: Metadata = {
  title: "Live Queue Display",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return <QueueBoard />;
}
