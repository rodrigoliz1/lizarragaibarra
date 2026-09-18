import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { lawyers, type Lawyer } from "@/data/lawyers";
export const getPublicContent = cache(async () => {
  if (!process.env.DATABASE_URL) return { cases: [], articles: [] };
  const [cases, articles] = await Promise.all([
    db.caseStudy.findMany({
      where: {
        status: "PUBLISHED",
        visibility: { in: ["PUBLIC", "ANONYMIZED"] },
        publishedAt: { lte: new Date() },
      },
      include: { coverImage: true },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      take: 100,
    }),
    db.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      include: {
        heroMedia: true,
        author: { select: { name: true } },
        practiceArea: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 100,
    }),
  ]);
  return { cases, articles };
});
export const getPublicTeam = cache(async (): Promise<Lawyer[]> => {
  if (!process.env.DATABASE_URL) return [...lawyers];
  const profiles = await db.lawyerProfile.findMany({
    where: { active: true },
    include: { photo: true, areas: { include: { practiceArea: true } } },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });
  return profiles.map((p) => ({
    slug: p.slug,
    name: p.displayName,
    initials: p.displayName
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join(""),
    role: p.position,
    primaryArea: p.areas.map((a) => a.practiceArea.name).join(" · "),
    areas: p.areas.map((a) => a.practiceArea.name),
    biography: p.bio.split("\n").filter(Boolean),
    education: [p.education],
    focus: p.areas.map((a) => a.practiceArea.shortDescription),
    email: p.emailPublic || "",
    phone: p.phone || "",
    whatsapp: p.phone ? "52" + p.phone.replace(/\D/g, "").slice(-10) : "",
    image:
      p.photo?.status === "READY"
        ? `/api/media/${p.photo.id}`
        : p.image || undefined,
    imageAlt: p.photo?.altText || p.imageAlt || p.displayName,
  }));
});
