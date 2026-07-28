import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { legalContent } from "@/lib/content/platform";
export const metadata:Metadata={title:legalContent.terms.title,alternates:{canonical:"/terms"}};
export default function Page(){return <LegalPage title={legalContent.terms.title} sections={legalContent.terms.sections}/>}
