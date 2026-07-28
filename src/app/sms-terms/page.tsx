import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { legalContent } from "@/lib/content/platform";
export const metadata:Metadata={title:legalContent.sms.title,alternates:{canonical:"/sms-terms"}};
export default function Page(){return <LegalPage title={legalContent.sms.title} sections={legalContent.sms.sections}/>}
