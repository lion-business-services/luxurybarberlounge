import type { Metadata } from "next";
import { PortalSectionPage } from "@/components/portal/PortalSectionPage";
export const metadata:Metadata={title:"Appointments",robots:{index:false,follow:false}};
export default function Page(){return <PortalSectionPage role="client" slug="appointments"/>}
