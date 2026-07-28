import type { Metadata } from "next";
import { PortalSectionPage } from "@/components/portal/PortalSectionPage";
export const metadata:Metadata={title:"Services",robots:{index:false,follow:false}};
export default function Page(){return <PortalSectionPage role="admin" slug="services"/>}
