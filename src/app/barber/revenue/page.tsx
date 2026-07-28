import type { Metadata } from "next";
import { PortalSectionPage } from "@/components/portal/PortalSectionPage";
export const metadata:Metadata={title:"Revenue",robots:{index:false,follow:false}};
export default function Page(){return <PortalSectionPage role="barber" slug="revenue"/>}
