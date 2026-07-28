import type { Metadata } from "next";
import { PortalSectionPage } from "@/components/portal/PortalSectionPage";
export const metadata:Metadata={title:"Memberships",robots:{index:false,follow:false}};
export default function Page(){return <PortalSectionPage role="admin" slug="memberships"/>}
