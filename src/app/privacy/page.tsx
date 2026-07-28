import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { legalContent } from "@/lib/content/platform";
export const metadata:Metadata={title:legalContent.privacy.title,robots:{index:true,follow:true},alternates:{canonical:"/privacy"}};
export default function Page(){return <LegalPage title={legalContent.privacy.title} sections={legalContent.privacy.sections}/>}
