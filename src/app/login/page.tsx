import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
export const metadata: Metadata = { title: "Portal Login", robots: { index: false, follow: false } };
export default function LoginPage(){return <AuthCard mode="login"/>}
