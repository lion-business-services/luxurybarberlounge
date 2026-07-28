import type { Metadata } from "next";
import { PortalSectionPage } from "@/components/portal/PortalSectionPage";
export const metadata:Metadata={title:"Shop Status",robots:{index:false,follow:false}};
export default function Page(){return <PortalSectionPage role="reception" slug="shop-status"/>}
