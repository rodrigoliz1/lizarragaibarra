import { ArticleStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import type {
  articleEditorSchema,
  articleReviewSchema,
} from "@/lib/validation";
import {
  canApproveArticle,
  canPublishArticle,
  type PolicyActor,
} from "@/server/policies";
import { AccessDeniedError, ServiceError } from "@/server/services/errors";
import type { z } from "zod";

type ArticleInput = z.infer<typeof articleEditorSchema>;
type ReviewInput = z.infer<typeof articleReviewSchema>;

function plainBody(input: ArticleInput) {
  return input.blocks
    .flatMap((block) => [block.text, ...(block.items ?? [])])
    .filter(Boolean)
    .join("\n\n");
}

async function requireArticleHero(actor: PolicyActor, mediaId?: string) {
  if (!mediaId) return undefined;
  const media = await db.mediaAsset.findFirst({
    where: {
      id: mediaId,
      status: "READY",
      type: "ARTICLE_HERO",
      ...(actor.role === "ADMIN" ? {} : { uploadedById: actor.id }),
    },
    select: { id: true },
  });
  if (!media)
    throw new ServiceError(
      "La imagen destacada no está disponible.",
      400,
      "ARTICLE_HERO_UNAVAILABLE",
    );
  return media.id;
}

async function resolveCoauthors(actor: PolicyActor, userIds: string[]) {
  const uniqueIds = [...new Set(userIds)].filter((id) => id !== actor.id);
  if (!uniqueIds.length) return [];
  const users = await db.user.findMany({
    where: {
      id: { in: uniqueIds },
      role: "LAWYER",
      status: "ACTIVE",
      lawyerProfile: { isNot: null },
    },
    select: { id: true },
  });
  if (users.length !== uniqueIds.length)
    throw new ServiceError(
      "Uno de los coautores no está disponible.",
      400,
      "COAUTHOR_UNAVAILABLE",
    );
  return uniqueIds;
}

export async function createArticleDraft(
  actor: PolicyActor,
  input: ArticleInput,
) {
  if (actor.role === "CLIENT") throw new AccessDeniedError();
  const heroMediaId = await requireArticleHero(actor, input.heroMediaId);
  const coauthorIds = await resolveCoauthors(actor, input.coauthorIds);
  const article = await db
    .$transaction(async (transaction) => {
      const created = await transaction.article.create({
        data: {
          slug: input.slug,
          title: input.title,
          subtitle: input.subtitle,
          excerpt: input.excerpt,
          body: plainBody(input),
          introduction: input.introduction,
          conclusion: input.conclusion,
          references: input.references,
          tags: input.tags,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          legalNotice: input.legalNotice,
          practiceAreaId: input.practiceAreaId,
          heroMediaId,
          authorId: actor.id,
          status: "DRAFT",
          blocks: {
            create: input.blocks.map((block, sortOrder) => ({
              type: block.type,
              sortOrder,
              content: block as Prisma.InputJsonValue,
              createdById: actor.id,
            })),
          },
          coauthors: {
            create: coauthorIds.map((userId, sortOrder) => ({
              userId,
              sortOrder,
            })),
          },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "ARTICLE_CREATED",
          entityType: "Article",
          entityId: created.id,
        },
      });
      return created;
    })
    .catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ServiceError("El slug ya está en uso.", 409, "SLUG_EXISTS");
      }
      throw error;
    });
  return article;
}

export async function updateArticleDraft(
  actor: PolicyActor,
  articleId: string,
  input: ArticleInput,
) {
  if (actor.role === "CLIENT") throw new AccessDeniedError();
  const heroMediaId = await requireArticleHero(actor, input.heroMediaId);
  const coauthorIds = await resolveCoauthors(actor, input.coauthorIds);
  const existing = await db.article.findFirst({
    where: {
      id: articleId,
      ...(actor.role === "ADMIN" ? {} : { authorId: actor.id }),
      ...(actor.role === "ADMIN"
        ? {}
        : {
            status: {
              in: [
                "DRAFT",
                "CHANGES_REQUESTED",
                "REJECTED",
                "PUBLISHED",
                "ARCHIVED",
              ],
            },
          }),
    },
    select: { id: true, status: true },
  });
  if (!existing) throw new AccessDeniedError();
  return db.$transaction(async (transaction) => {
    await transaction.articleBlock.deleteMany({ where: { articleId } });
    const article = await transaction.article.update({
      where: { id: articleId },
      data: {
        slug: input.slug,
        title: input.title,
        subtitle: input.subtitle,
        excerpt: input.excerpt,
        body: plainBody(input),
        introduction: input.introduction,
        conclusion: input.conclusion,
        references: input.references,
        tags: input.tags,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        legalNotice: input.legalNotice,
        practiceAreaId: input.practiceAreaId,
        heroMediaId: heroMediaId ?? null,
        status: existing.status === "REJECTED" ? "DRAFT" : undefined,
        blocks: {
          create: input.blocks.map((block, sortOrder) => ({
            type: block.type,
            sortOrder,
            content: block as Prisma.InputJsonValue,
            createdById: actor.id,
          })),
        },
        coauthors: {
          deleteMany: {},
          create: coauthorIds.map((userId, sortOrder) => ({
            userId,
            sortOrder,
          })),
        },
      },
    });
    if (existing.status === "PUBLISHED") {
      const latestRevision = await transaction.articleRevision.findFirst({
        where: { articleId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      await transaction.articleRevision.create({
        data: {
          articleId,
          version: (latestRevision?.version ?? 0) + 1,
          title: article.title,
          excerpt: article.excerpt,
          content: {
            body: article.body,
            blocks: input.blocks,
          } as Prisma.InputJsonValue,
          createdById: actor.id,
          changeSummary:
            input.changeSummary || "Actualización de artículo publicado",
          reviewStatus: "PUBLISHED",
        },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ARTICLE_DRAFT_UPDATED",
        entityType: "Article",
        entityId: articleId,
        metadata: { blockCount: input.blocks.length },
      },
    });
    return article;
  });
}

async function ownedArticle(actor: PolicyActor, articleId: string) {
  const article = await db.article.findFirst({
    where: {
      id: articleId,
      ...(actor.role === "ADMIN" ? {} : { authorId: actor.id }),
    },
    select: { id: true, status: true, heroMediaId: true },
  });
  if (!article) throw new AccessDeniedError();
  return article;
}

export async function archiveArticle(actor: PolicyActor, articleId: string) {
  if (actor.role === "CLIENT") throw new AccessDeniedError();
  const article = await ownedArticle(actor, articleId);
  if (article.status === "SUBMITTED") {
    throw new ServiceError(
      "El artículo está en revisión y no puede archivarse.",
      409,
      "ARTICLE_IN_REVIEW",
    );
  }
  await db.$transaction([
    db.article.update({
      where: { id: articleId },
      data: { status: "ARCHIVED", publishedAt: null },
    }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ARTICLE_ARCHIVED",
        entityType: "Article",
        entityId: articleId,
        metadata: { previousStatus: article.status },
      },
    }),
  ]);
  return { id: articleId, status: ArticleStatus.ARCHIVED };
}

export async function restoreArticle(actor: PolicyActor, articleId: string) {
  if (actor.role === "CLIENT") throw new AccessDeniedError();
  const article = await ownedArticle(actor, articleId);
  if (article.status !== "ARCHIVED") {
    throw new ServiceError(
      "El artículo no está archivado.",
      409,
      "ARTICLE_NOT_ARCHIVED",
    );
  }
  await db.$transaction([
    db.article.update({
      where: { id: articleId },
      data: { status: "DRAFT" },
    }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ARTICLE_RESTORED",
        entityType: "Article",
        entityId: articleId,
      },
    }),
  ]);
  return { id: articleId, status: ArticleStatus.DRAFT };
}

export async function deleteArticle(actor: PolicyActor, articleId: string) {
  if (actor.role === "CLIENT") throw new AccessDeniedError();
  const article = await ownedArticle(actor, articleId);
  if (!["DRAFT", "REJECTED", "ARCHIVED"].includes(article.status)) {
    throw new ServiceError(
      "Archiva el artículo antes de eliminarlo definitivamente.",
      409,
      "ARTICLE_MUST_BE_ARCHIVED",
    );
  }
  await db.$transaction(async (transaction) => {
    await transaction.articleCoauthor.deleteMany({ where: { articleId } });
    await transaction.articleBlock.deleteMany({ where: { articleId } });
    await transaction.articleReview.deleteMany({ where: { articleId } });
    await transaction.articleRevision.deleteMany({ where: { articleId } });
    await transaction.article.delete({ where: { id: articleId } });
    if (article.heroMediaId) {
      await transaction.mediaAsset.updateMany({
        where: { id: article.heroMediaId, heroArticles: { none: {} } },
        data: { status: "ARCHIVED" },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ARTICLE_DELETED",
        entityType: "Article",
        entityId: articleId,
      },
    });
  });
  return { id: articleId };
}

export async function submitArticle(actor: PolicyActor, articleId: string) {
  if (actor.role === "CLIENT") throw new AccessDeniedError();
  const article = await db.article.findFirst({
    where: {
      id: articleId,
      ...(actor.role === "ADMIN" ? {} : { authorId: actor.id }),
      status: { in: ["DRAFT", "CHANGES_REQUESTED"] },
    },
    include: {
      blocks: { orderBy: { sortOrder: "asc" } },
      revisions: {
        select: { version: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });
  if (!article) throw new AccessDeniedError();
  const version = (article.revisions[0]?.version ?? 0) + 1;
  await db.$transaction(async (transaction) => {
    await transaction.article.update({
      where: { id: articleId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    await transaction.articleRevision.create({
      data: {
        articleId,
        version,
        title: article.title,
        excerpt: article.excerpt,
        content: {
          body: article.body,
          blocks: article.blocks.map((block) => block.content),
        } as Prisma.InputJsonValue,
        createdById: actor.id,
        changeSummary: "Envío a revisión editorial",
        reviewStatus: "SUBMITTED",
      },
    });
    await transaction.articleReview.create({
      data: { articleId, reviewerId: actor.id, decision: "SUBMITTED" },
    });
    const reviewers = await transaction.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { role: "ADMIN" },
          { lawyerProfile: { rank: "PARTNER", active: true } },
        ],
      },
      select: { id: true },
    });
    await transaction.notification.createMany({
      data: reviewers
        .filter((reviewer) => reviewer.id !== actor.id)
        .map((reviewer) => ({
          recipientId: reviewer.id,
          type: "ARTICLE_SUBMITTED" as const,
          title: "Artículo pendiente de revisión",
          body: `Se recibió “${article.title}” para revisión editorial.`,
          href: `/admin/articulos/pendientes`,
          metadata: { articleId },
        })),
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ARTICLE_SUBMITTED",
        entityType: "Article",
        entityId: articleId,
        metadata: { version },
      },
    });
  });
  return { id: articleId, status: ArticleStatus.SUBMITTED, version };
}

export async function reviewArticle(
  actor: PolicyActor,
  articleId: string,
  input: ReviewInput,
) {
  if (!canApproveArticle(actor)) throw new AccessDeniedError();
  const article = await db.article.findFirst({
    where: {
      id: articleId,
      status: { in: ["SUBMITTED", "APPROVED", "CHANGES_REQUESTED"] },
    },
    include: { author: { select: { id: true, email: true, name: true } } },
  });
  if (!article)
    throw new ServiceError(
      "El artículo no está disponible para revisión.",
      409,
      "ARTICLE_NOT_REVIEWABLE",
    );
  const autoPublish = process.env.ARTICLE_AUTO_PUBLISH_ON_APPROVAL !== "false";
  const nextStatus =
    input.decision === "APPROVED" && autoPublish
      ? ArticleStatus.PUBLISHED
      : ArticleStatus[input.decision];
  await db.$transaction(async (transaction) => {
    await transaction.article.update({
      where: { id: articleId },
      data: {
        status: nextStatus,
        approvedById: ["APPROVED", "PUBLISHED"].includes(input.decision)
          ? actor.id
          : undefined,
        approvedAt: ["APPROVED", "PUBLISHED"].includes(input.decision)
          ? new Date()
          : undefined,
        publishedAt: nextStatus === "PUBLISHED" ? new Date() : undefined,
        rejectedAt: nextStatus === "REJECTED" ? new Date() : undefined,
      },
    });
    await transaction.articleReview.create({
      data: {
        articleId,
        reviewerId: actor.id,
        decision: input.decision,
        comments: input.comments,
      },
    });
    if (article.authorId) {
      const type =
        nextStatus === "CHANGES_REQUESTED"
          ? "ARTICLE_CHANGES_REQUESTED"
          : nextStatus === "PUBLISHED"
            ? "ARTICLE_PUBLISHED"
            : nextStatus === "APPROVED"
              ? "ARTICLE_APPROVED"
              : "SYSTEM";
      await transaction.notification.create({
        data: {
          recipientId: article.authorId,
          type,
          title: `Estado editorial: ${nextStatus.replaceAll("_", " ")}`,
          body: `El artículo “${article.title}” cambió de estado.`,
          href: `/portal/abogado/articulos/${articleId}`,
          metadata: { articleId },
        },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: `ARTICLE_${input.decision}`,
        entityType: "Article",
        entityId: articleId,
      },
    });
  });
  if (article.author?.email) {
    const content = renderTransactionalEmail({
      eyebrow: "Flujo editorial",
      title: `Actualización de artículo: ${nextStatus.replaceAll("_", " ")}`,
      greeting: `Hola ${article.author.name},`,
      paragraphs: [
        `El artículo “${article.title}” cambió de estado.`,
        input.comments || "Consulta el detalle en el portal editorial.",
      ],
      action: {
        label: "Abrir artículo",
        url: new URL(
          `/portal/abogado/articulos/${articleId}`,
          getSiteUrl(),
        ).toString(),
      },
    });
    await sendTrackedEmail({
      to: article.author.email,
      subject: `Actualización editorial · ${article.title}`,
      template:
        nextStatus === "CHANGES_REQUESTED"
          ? "article-changes-requested"
          : nextStatus === "PUBLISHED"
            ? "article-published"
            : "article-approved",
      ...content,
      tags: ["article", "editorial"],
    }).catch(() => undefined);
  }
  return { id: articleId, slug: article.slug, status: nextStatus };
}

export function mayPublishOwnArticle(actor: PolicyActor) {
  return canPublishArticle(actor);
}

export async function publishOwnArticle(actor: PolicyActor, articleId: string) {
  if (!canPublishArticle(actor)) throw new AccessDeniedError();
  const article = await db.article.findFirst({
    where: {
      id: articleId,
      ...(actor.role === "ADMIN" ? {} : { authorId: actor.id }),
      status: { in: ["DRAFT", "APPROVED", "CHANGES_REQUESTED"] },
    },
    include: {
      blocks: { orderBy: { sortOrder: "asc" } },
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { version: true },
      },
    },
  });
  if (!article) throw new AccessDeniedError();
  const version = (article.revisions[0]?.version ?? 0) + 1;
  await db.$transaction([
    db.article.update({
      where: { id: articleId },
      data: {
        status: "PUBLISHED",
        approvedById: actor.id,
        approvedAt: new Date(),
        publishedAt: new Date(),
      },
    }),
    db.articleRevision.create({
      data: {
        articleId,
        version,
        title: article.title,
        excerpt: article.excerpt,
        content: {
          body: article.body,
          blocks: article.blocks.map((block) => block.content),
        } as Prisma.InputJsonValue,
        createdById: actor.id,
        changeSummary: "Publicación directa autorizada",
        reviewStatus: "PUBLISHED",
      },
    }),
    db.articleReview.create({
      data: {
        articleId,
        reviewerId: actor.id,
        decision: "PUBLISHED",
        comments: "Publicación directa autorizada por rango profesional.",
      },
    }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ARTICLE_PUBLISHED_DIRECTLY",
        entityType: "Article",
        entityId: articleId,
        metadata: { version },
      },
    }),
  ]);
  return {
    id: articleId,
    slug: article.slug,
    status: ArticleStatus.PUBLISHED,
  };
}
