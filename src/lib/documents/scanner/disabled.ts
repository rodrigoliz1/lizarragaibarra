import {
  DocumentScannerUnavailableError,
  type DocumentScanner,
  type DocumentScannerResult,
} from "@/lib/documents/scanner/types";

export class DisabledDocumentScanner implements DocumentScanner {
  readonly name = "disabled" as const;

  async scan(): Promise<DocumentScannerResult> {
    throw new DocumentScannerUnavailableError(
      "El análisis de documentos está temporalmente deshabilitado.",
    );
  }
}
