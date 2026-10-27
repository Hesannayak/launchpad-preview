import { describe, expect, it } from "vitest";

import { projectInputSchema, slugify } from "@/lib/schemas";

const validBase = {
  name: "Nebula Protocol",
  tagline: "A restaking layer for modular chains",
  description: "Nebula Protocol lets stakers recycle security across modular rollups without new trust assumptions.",
  website_url: "",
  x_url: "",
  dev_x_url: "",
  launch_date: "",
  logo_path: "",
};

describe("project listing rules", () => {
  it("rejects a launch date in the past", () => {
    const result = projectInputSchema.safeParse({ ...validBase, launch_date: "2020-01-01" });
    expect(result.success).toBe(false);
  });

  it("accepts a launch date today or later", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = projectInputSchema.safeParse({ ...validBase, launch_date: today });
    expect(result.success).toBe(true);
  });

  it("rejects X links that are not x.com profile links", () => {
    const result = projectInputSchema.safeParse({ ...validBase, x_url: "https://example.com/project" });
    expect(result.success).toBe(false);
  });

  it("accepts a full x.com profile link", () => {
    const result = projectInputSchema.safeParse({ ...validBase, x_url: "https://x.com/nebula" });
    expect(result.success).toBe(true);
  });

  it("turns empty link fields into no value", () => {
    const result = projectInputSchema.parse({ ...validBase });
    expect(result.website_url).toBeUndefined();
    expect(result.launch_date).toBeUndefined();
  });

  it("slugifies project names for URLs", () => {
    expect(slugify("Super Coin!!")).toBe("super-coin");
    expect(slugify("   ")).toBe("project");
  });
});
