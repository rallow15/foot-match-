import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="relative z-10 flex-1 fade-in">{children}</main>
      <Footer />
    </>
  );
}
