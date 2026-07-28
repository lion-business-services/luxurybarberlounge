import type { Metadata } from "next";
import { PortalSectionPage } from "@/components/portal/PortalSectionPage";
export const metadata:Metadata={title:"Notification Settings",robots:{index:false,follow:false}};
export default function Page(){return <PortalSectionPage role="admin" slug="notification-settings"/>}
