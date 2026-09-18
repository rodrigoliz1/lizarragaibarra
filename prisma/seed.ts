import { PrismaClient } from "@prisma/client";
import { lawyers } from "../src/data/lawyers";
import { practiceAreas } from "../src/data/practice-areas";
const db = new PrismaClient();
async function main() {
  for (const area of practiceAreas) {
    await db.practiceArea.upsert({
      where: { slug: area.slug },
      update: {},
      create: {
        slug: area.slug,
        name: area.title,
        shortDescription: area.shortDescription,
        body: area.summary,
        servicesJson: area.services,
        faqsJson: [],
        sortOrder: Number(area.index),
      },
    });
  }
  for (const [index, lawyer] of lawyers.entries()) {
    const areas = await db.practiceArea.findMany({
      where: {
        slug: {
          in: practiceAreas
            .filter((a) => a.relatedLawyerSlugs.includes(lawyer.slug))
            .map((a) => a.slug),
        },
      },
    });
    await db.lawyerProfile.upsert({
      where: { slug: lawyer.slug },
      update: {},
      create: {
        slug: lawyer.slug,
        displayName: lawyer.name,
        position: lawyer.role,
        rank: "PARTNER",
        bio: lawyer.biography.join("\n"),
        education: lawyer.education.join("\n"),
        phone: lawyer.phone,
        emailPublic: lawyer.email,
        image: lawyer.image,
        imageAlt: lawyer.imageAlt,
        sortOrder: index,
        featured: true,
        areas: {
          create: areas.map((a, i) => ({
            practiceAreaId: a.id,
            isPrimary: i === 0,
          })),
        },
      },
    });
  }
  await db.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  console.info(
    "Contenido real de LI registrado. No se crearon cuentas, horarios, casos ni publicaciones ficticias.",
  );
}
main()
  .catch(() => {
    console.error(
      "No se pudo registrar el contenido. Revise la conexión y las migraciones.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
