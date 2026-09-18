import "server-only";
import { db } from "@/lib/db";
export async function mediaUsage(id: string) {
  const [heroes, team, cases, inline] = await Promise.all([
    db.article.count({ where: { heroMediaId: id } }),
    db.lawyerProfile.count({ where: { photoId: id } }),
    db.caseStudy.count({ where: { coverImageId: id } }),
    db.articleBlock.count({
      where: { content: { path: ["mediaId"], equals: id } },
    }),
  ]);
  return heroes + team + cases + inline;
}
export async function isPublicMedia(id: string) {
  const asset = await db.mediaAsset.findFirst({
    where: { id, status: "READY", type: { not: "DOCUMENT" } },
  });
  if (!asset) return null;
  if (asset.public) return asset;
  const now = new Date();
  const [article, inline, team, study] = await Promise.all([
    db.article.findFirst({
      where: {
        heroMediaId: id,
        status: "PUBLISHED",
        publishedAt: { lte: now },
      },
      select: { id: true },
    }),
    db.articleBlock.findFirst({
      where: {
        content: { path: ["mediaId"], equals: id },
        article: { status: "PUBLISHED", publishedAt: { lte: now } },
      },
      select: { id: true },
    }),
    db.lawyerProfile.findFirst({
      where: { photoId: id, active: true },
      select: { id: true },
    }),
    db.caseStudy.findFirst({
      where: {
        coverImageId: id,
        status: "PUBLISHED",
        visibility: { in: ["PUBLIC", "ANONYMIZED"] },
        publishedAt: { lte: now },
      },
      select: { id: true },
    }),
  ]);
  return article || inline || team || study ? asset : null;
}
