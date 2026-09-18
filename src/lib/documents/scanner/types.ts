export type DocumentScannerResult =
  { verdict: "clean" } | { verdict: "infected"; threat?: string };

export interface DocumentScanner {
  readonly name: "mock" | "clamav";
  scan(bytes: Uint8Array): Promise<DocumentScannerResult>;
}

export class DocumentScannerUnavailableError extends Error {
  constructor(message = "El servicio de análisis no está disponible.") {
    super(message);
    this.name = "DocumentScannerUnavailableError";
  }
}

export class DocumentScannerInputError extends Error {
  constructor(message = "El archivo no puede analizarse.") {
    super(message);
    this.name = "DocumentScannerInputError";
  }
}
