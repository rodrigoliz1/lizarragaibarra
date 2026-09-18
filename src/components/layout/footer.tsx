import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./logo";
import { practiceAreas } from "@/data/practice-areas";
import { getPublicSiteSettings } from "@/server/services/site-settings-service";
export async function Footer() {
  const settings = await getPublicSiteSettings();
  return (
    <footer className="li-footer">
      <div className="li-container footer-top">
        <div>
          <Logo inverse />
          <p>
            Litigio. Estrategia.
            <br />
            Solución de controversias.
          </p>
        </div>
        <div>
          <span className="li-label">La firma</span>
          <Link href="/nosotros">Nosotros</Link>
          <Link href="/equipo">Equipo</Link>
          <Link href="/contacto">Contacto</Link>
          <Link href="/portal">Portal privado</Link>
        </div>
        <div>
          <span className="li-label">Áreas de práctica</span>
          {practiceAreas.map((area) => (
            <Link key={area.slug} href={"/servicios/" + area.slug}>
              {area.shortTitle}
            </Link>
          ))}
        </div>
        <div>
          <span className="li-label">Conversemos</span>
          <a href={"mailto:" + settings.contactEmail}>
            {settings.contactEmail}
          </a>
          <a href={"tel:" + settings.phoneE164}>{settings.phoneDisplay}</a>
          {settings.address && <p>{settings.address}</p>}
          <Link href="/agendar" className="footer-appointment">
            Agendar consulta <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="li-container footer-bottom">
        <span>© {new Date().getFullYear()} Lizárraga & Ibarra Abogados</span>
        <div>
          <Link href="/aviso-de-privacidad">Aviso de privacidad</Link>
          <Link href="/terminos">Términos de uso</Link>
        </div>
        <span>Rigor en cada decisión.</span>
      </div>
    </footer>
  );
}
