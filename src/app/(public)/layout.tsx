import { Header } from "@/components/Header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header club={null} />
      {children}
    </>
  );
}
