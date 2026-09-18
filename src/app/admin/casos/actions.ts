"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/policies";
import { caseStudySchema } from "@/lib/validation/case-study";
import { saveCaseStudy } from "@/server/services/case-study-service";
export async function saveCase(data: FormData) {
  const actor = await requireAdmin();
  const id = String(data.get("id") || "");
  const parsed = caseStudySchema.safeParse({
    ...Object.fromEntries(data),
    coverImageId: data.get("coverImageId") || null,
    featured: data.get("featured") === "on",
    reviewed: data.get("reviewed") === "on",
  });
  const path = "/admin/casos/" + (id || "nuevo");
  if (!parsed.success) redirect(path + "?error=datos");
  let saved;
  try {
    saved = await saveCaseStudy(actor, id || null, parsed.data);
  } catch {
    redirect(path + "?error=guardado");
  }
  revalidatePath("/", "layout");
  redirect("/admin/casos/" + saved.id + "?guardado=1");
}
