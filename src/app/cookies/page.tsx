import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { legalContent } from "@/lib/content/platform";
export const metadata:Metadata={title:legalContent.cookies.title,alternates:{canonical:"/cookies"}};
export default function Page(){return <LegalPage title={legalContent.cookies.title} sections={legalContent.cookies.sections}/>}
