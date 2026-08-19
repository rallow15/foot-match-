import Link from "next/link";
import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" prefetch className={`group inline-flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Matchs Amicaux"
        width={160}
        height={48}
        className="h-12 w-auto object-contain"
        priority
        sizes="160px"
      />
    </Link>
  );
}