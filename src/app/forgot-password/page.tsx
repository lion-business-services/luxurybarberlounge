import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
export const metadata: Metadata = { title: "Reset Password", robots: { index: false, follow: false } };
export default function ForgotPasswordPage(){return <AuthCard mode="forgot"/>}
