import type { Metadata } from "next";
import { AuthCallbackClient } from "./view";

export const metadata: Metadata = { title: "Secure Portal Callback", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AuthCallbackPage({ searchParams }: Props) {
  const params = await searchParams;
  return <AuthCallbackClient code={typeof params.code === "string" ? params.code : ""} next={typeof params.next === "string" ? params.next : "/client"} />;
}
