import type { MatterStage, MatterStatus, Visibility } from "@prisma/client";

export type MatterSummaryDTO = {
  id: string;
  reference: string;
  title: string;
  status: MatterStatus;
  stage: MatterStage;
  nextActionAt: string | null;
  nextActionPublic: string | null;
  updatedAt: string;
};

export function toMatterSummaryDTO(matter: {
  id: string;
  reference: string;
  title: string;
  status: MatterStatus;
  stage: MatterStage;
  nextActionAt: Date | null;
  nextActionPublic: string | null;
  updatedAt: Date;
}): MatterSummaryDTO {
  return {
    ...matter,
    nextActionAt: matter.nextActionAt?.toISOString() ?? null,
    updatedAt: matter.updatedAt.toISOString(),
  };
}

export function toVisibleTimelineItem(item: {
  id: string;
  title: string;
  body: string;
  visibility: Visibility;
  createdAt: Date;
}) {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    visibility: item.visibility,
    createdAt: item.createdAt.toISOString(),
  };
}
