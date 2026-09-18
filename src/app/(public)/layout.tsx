import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublicContent } from "@/server/services/public-content-service";
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cases, articles } = await getPublicContent();
  return (
    <div className="li-public">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <Header hasCases={cases.length > 0} hasInsights={articles.length > 0} />
      <main id="contenido" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
