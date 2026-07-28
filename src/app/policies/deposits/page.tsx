import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { policies } from "@/lib/content/platform";
const content=policies.deposits;
export const metadata:Metadata={title:content.title,description:content.intro,alternates:{canonical:"/policies/deposits"}};
export default function Page(){return <LegalPage title={content.title} sections={content.sections}/>}
