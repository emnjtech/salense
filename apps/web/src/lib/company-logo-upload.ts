export const companyLogoMaxBytes = 2 * 1024 * 1024;

export const acceptedCompanyLogoMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
] as const;

export const acceptedCompanyLogoInputTypes = acceptedCompanyLogoMimeTypes.join(",");

export interface CompanyLogoFile {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

export interface StoredCompanyLogo {
  readonly dataUrl: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
}

export type CompanyLogoValidationResult =
  | { readonly ok: true }
  | { readonly message: string; readonly ok: false };

export type CompanyLogoDataUrlReader = (file: File) => Promise<string>;

export function validateCompanyLogoFile(file: CompanyLogoFile): CompanyLogoValidationResult {
  if (!acceptedCompanyLogoMimeTypes.includes(file.type as AcceptedCompanyLogoMimeType)) {
    return {
      message: "Upload a PNG, JPG, SVG, or WebP logo.",
      ok: false,
    };
  }

  if (file.size > companyLogoMaxBytes) {
    return {
      message: "Upload a logo up to 2MB.",
      ok: false,
    };
  }

  return { ok: true };
}

export async function storeCompanyLogoForLocalProfile(
  file: File,
  readAsDataUrl: CompanyLogoDataUrlReader = readBrowserFileAsDataUrl,
): Promise<StoredCompanyLogo> {
  const validation = validateCompanyLogoFile(file);

  if (!validation.ok) {
    throw new CompanyLogoUploadError(validation.message);
  }

  const dataUrl = await readAsDataUrl(file);

  return {
    dataUrl,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

export class CompanyLogoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyLogoUploadError";
  }
}

type AcceptedCompanyLogoMimeType = (typeof acceptedCompanyLogoMimeTypes)[number];

function readBrowserFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new CompanyLogoUploadError("We could not read that logo file."));
    });
    reader.addEventListener("error", () => {
      reject(new CompanyLogoUploadError("We could not read that logo file."));
    });
    reader.readAsDataURL(file);
  });
}
