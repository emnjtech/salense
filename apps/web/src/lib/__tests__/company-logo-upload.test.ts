import {
  CompanyLogoUploadError,
  companyLogoMaxBytes,
  storeCompanyLogoForLocalProfile,
  validateCompanyLogoFile,
} from "../company-logo-upload";

describe("company logo upload storage", () => {
  it("accepts supported image files up to 2MB", () => {
    expect(
      validateCompanyLogoFile({
        name: "northstar-logo.png",
        size: 120_000,
        type: "image/png",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects unsupported image formats with friendly copy", () => {
    expect(
      validateCompanyLogoFile({
        name: "northstar-logo.gif",
        size: 120_000,
        type: "image/gif",
      }),
    ).toEqual({
      message: "Upload a PNG, JPG, SVG, or WebP logo.",
      ok: false,
    });
  });

  it("rejects oversized logos with friendly copy", () => {
    expect(
      validateCompanyLogoFile({
        name: "northstar-logo.png",
        size: companyLogoMaxBytes + 1,
        type: "image/png",
      }),
    ).toEqual({
      message: "Upload a logo up to 2MB.",
      ok: false,
    });
  });

  it("stores valid logos as local profile data URLs for preview and submission", async () => {
    const file = {
      name: "northstar-logo.webp",
      size: 128_000,
      type: "image/webp",
    } as File;

    await expect(
      storeCompanyLogoForLocalProfile(
        file,
        async () => "data:image/webp;base64,ZmFrZS1sb2dv",
      ),
    ).resolves.toEqual({
      dataUrl: "data:image/webp;base64,ZmFrZS1sb2dv",
      fileName: "northstar-logo.webp",
      mimeType: "image/webp",
      size: 128_000,
    });
  });

  it("does not read invalid files", async () => {
    const file = {
      name: "northstar-logo.gif",
      size: 128_000,
      type: "image/gif",
    } as File;
    const reader = jest.fn<Promise<string>, [File]>();

    await expect(storeCompanyLogoForLocalProfile(file, reader)).rejects.toThrow(
      CompanyLogoUploadError,
    );
    expect(reader).not.toHaveBeenCalled();
  });
});
