import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { legalContent } from "@/lib/content/platform";
export const metadata:Metadata={title:legalContent.accessibility.title,alternates:{canonical:"/accessibility"}};
export default function Page(){return <LegalPage title={legalContent.accessibility.title} sections={legalContent.accessibility.sections}/>}
