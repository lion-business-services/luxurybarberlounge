import Link from "next/link";
import styles from "@/components/client/client-portal.module.css";
export default function NotFound(){return <div className={styles.heroCard}><p className={styles.eyebrow}>Not available</p><h1 className="font-display mt-3 text-4xl">This client record was not found.</h1><p className={`mt-3 text-sm ${styles.muted}`}>It may not exist or may not belong to your verified account.</p><Link href="/client" className="mt-6 inline-flex rounded-full bg-[var(--color-brass)] px-5 py-3 text-[9px] tracking-[.16em] uppercase text-[var(--color-ink)]">Client dashboard</Link></div>}
