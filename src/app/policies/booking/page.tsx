import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { policies } from "@/lib/content/platform";
const content=policies.booking;
export const metadata:Metadata={title:content.title,description:content.intro,alternates:{canonical:"/policies/booking"}};
export default function Page(){return <LegalPage title={content.title} sections={content.sections}/>}
