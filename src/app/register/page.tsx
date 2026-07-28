import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
export const metadata: Metadata = { title: "Create Client Account", robots: { index: false, follow: false } };
export default function RegisterPage(){return <AuthCard mode="register"/>}
