import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/legal-document";
import {
  LEGAL_LAST_UPDATED,
  PRIVACY_CONTENT,
  legalHeadings,
} from "@/data/legal-documents";
export const metadata: Metadata = {
  title: "Privacidad",
  alternates: { canonical: "/aviso-de-privacidad" },
};
export default function Privacy() {
  return (
    <LegalDocument
      content={PRIVACY_CONTENT}
      headings={legalHeadings(PRIVACY_CONTENT)}
      title="Aviso de Privacidad Integral"
      updated={LEGAL_LAST_UPDATED}
    />
  );
}
