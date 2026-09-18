import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/legal-document";
import {
  LEGAL_LAST_UPDATED,
  TERMS_CONTENT,
  legalHeadings,
} from "@/data/legal-documents";
export const metadata: Metadata = {
  title: "Términos de uso",
  alternates: { canonical: "/terminos" },
};
export default function Terms() {
  return (
    <LegalDocument
      content={TERMS_CONTENT}
      headings={legalHeadings(TERMS_CONTENT)}
      title="Términos y Condiciones de Uso"
      updated={LEGAL_LAST_UPDATED}
    />
  );
}
