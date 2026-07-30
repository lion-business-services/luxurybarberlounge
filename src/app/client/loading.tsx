import styles from "@/components/client/client-portal.module.css";

export default function Loading() {
  return <div className={styles.grid} aria-busy="true" aria-label="Loading client portal">
    <div className={`${styles.heroCard} animate-pulse`}><div className="h-3 w-28 rounded bg-white/10"/><div className="mt-5 h-10 w-2/3 rounded bg-white/10"/><div className="mt-4 h-4 w-1/2 rounded bg-white/5"/></div>
    <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map((item)=><div key={item} className={`${styles.card} animate-pulse`}><div className="h-3 w-24 rounded bg-white/10"/><div className="mt-4 h-7 w-1/2 rounded bg-white/10"/><div className="mt-4 h-16 rounded bg-white/5"/></div>)}</div>
  </div>;
}
