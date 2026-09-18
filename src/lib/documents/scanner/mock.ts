import type {
  DocumentScanner,
  DocumentScannerResult,
} from "@/lib/documents/scanner/types";

export class MockDocumentScanner implements DocumentScanner {
  readonly name = "mock" as const;

  async scan(): Promise<DocumentScannerResult> {
    return { verdict: "clean" };
  }
}
