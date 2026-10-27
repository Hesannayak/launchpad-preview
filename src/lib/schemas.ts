import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = (label: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .max(300, `${label} link is too long`)
      .url(`${label} must be a valid URL`)
      .optional()
      .nullable(),
  );

const xProfilePattern = /^https:\/\/(www\.)?(x\.com|twitter\.com)\/[A-Za-z0-9_]{1,15}\/?$/;

const optionalXUrl = (label: string) =>
  optionalUrl(label).refine(
    (value) => !value || xProfilePattern.test(value),
    `${label} must be a full x.com profile link (e.g. https://x.com/handle)`,
  );

const optionalDateString = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid launch date")
    .optional()
    .nullable(),
);

const optionalLogoPath = z.preprocess(
  emptyToUndefined,
  z.string().max(400).optional().nullable(),
);

export const projectInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name is too long"),
    tagline: z.string().trim().min(4, "Tagline must be at least 4 characters").max(120, "Tagline is too long"),
    description: z
      .string()
      .trim()
      .min(20, "Tell people a bit more (at least 20 characters)")
      .max(2000, "Description is too long"),
    website_url: optionalUrl("Website"),
    x_url: optionalXUrl("X"),
    dev_x_url: optionalXUrl("Dev X"),
    launch_date: optionalDateString,
    logo_path: optionalLogoPath,
  })
  .superRefine((data, ctx) => {
    if (!data.launch_date) return;
    const today = new Date().toISOString().slice(0, 10);
    if (data.launch_date < today) {
      ctx.addIssue({
        code: "custom",
        path: ["launch_date"],
        message: "Launch date can't be in the past",
      });
    }
  });

export type ProjectInput = z.infer<typeof projectInputSchema>;

export type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  website_url: string | null;
  x_url: string | null;
  dev_x_url: string | null;
  launch_date: string | null;
  logo_path: string | null;
  logo_url: string | null;
  owner_id: string;
};

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base || "project";
}
