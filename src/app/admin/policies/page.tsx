import type { Metadata } from "next"; import { PolicyGovernancePanel } from "@/components/admin/PolicyGovernancePanel";
export const metadata: Metadata={title:"Policy Governance",robots:{index:false,follow:false}}; export default function Page(){return <PolicyGovernancePanel/>}
