import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { practiceAreas } from "@/data/practice-areas";
import {
  getPublicContent,
  getPublicTeam,
} from "@/server/services/public-content-service";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [team, { cases, articles }] = await Promise.all([
    getPublicTeam(),
    getPublicContent(),
  ]);
  return [
    "",
    "/nosotros",
    "/servicios",
    "/equipo",
    "/contacto",
    "/agendar",
    "/aviso-de-privacidad",
    "/terminos",
    ...practiceAreas.map((a) => "/servicios/" + a.slug),
    ...team.map((l) => "/equipo/" + l.slug),
    ...(cases.length
      ? ["/casos-de-exito", ...cases.map((c) => "/casos-de-exito/" + c.slug)]
      : []),
    ...(articles.length
      ? ["/insights", ...articles.map((a) => "/insights/" + a.slug)]
      : []),
  ].map((path) => ({
    url: siteConfig.url + path,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
