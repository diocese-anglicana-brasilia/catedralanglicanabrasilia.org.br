import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { dateFieldsLoader, eventsLoader } from "./loaders/events";
import { parseEventTime } from "./utils/event-time";

const seoFields = {
  seo_description: z.string().nullish(),
  seo_keywords: z.string().nullish(),
};

const monthOrDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const monthYear = /^(\d{2})\/(\d{4})$/.exec(value);
  const fullDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!monthYear && !fullDate) return value;
  const year = monthYear ? monthYear[2] : fullDate![3];
  const month = monthYear ? monthYear[1] : fullDate![2];
  const day = monthYear ? "01" : fullDate![1];
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? new Date(NaN) : date;
}, z.coerce.date().nullish());

const news = defineCollection({
  loader: dateFieldsLoader("news", ["date"]),
  schema: ({ image }) => z.object({
    ...seoFields,
    title: z.string(),
    date: z.preprocess(parseEventTime, z.coerce.date()),
    author: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    featured_image: image().optional(),
    excerpt: z.string().nullish(),
  }),
});

const tags = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/tags" }),
  schema: z.object({ title: z.string() }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/authors" }),
  schema: ({ image }) => z.object({
    name: z.string(),
    bio: z.string().nullish(),
    photo: image().optional(),
    email: z.string().nullish(),
  }),
});

const locations = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/locations" }),
  schema: z.object({
    ...seoFields,
    name: z.string(),
    map_location: z.string().nullish(),
    jurisdiction: z.string().nullish(),
    address: z.string().nullish(),
    city: z.string().nullish(),
    online_url: z.string().nullish(),
    capacity: z.number().nullish(),
  }),
});

const events = defineCollection({
  loader: eventsLoader(),
  schema: z.object({
    ...seoFields,
    name: z.string(),
    start_date: z.preprocess(parseEventTime, z.coerce.date()),
    end_date: z.preprocess(parseEventTime, z.coerce.date().nullish()),
    location: z.string().nullish(),
    description: z.string().nullish(),
    registration_url: z.string().nullish(),
    featured: z.boolean().default(false),
  }),
});

const board_members = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/board-members" }),
  schema: ({ image }) => z.object({
    ...seoFields,
    name: z.string(),
    role: z.string(),
    is_active: z.boolean().default(true),
    indexable: z.boolean().default(false),
    start_date: monthOrDate,
    bio: z.string().nullish(),
    photo: image().optional(),
    email: z.string().nullish(),
  }),
});

const programs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/programs" }),
  schema: ({ image }) => z.object({
    ...seoFields,
    name: z.string(),
    description: z.string(),
    goals: z.array(z.string()).nullish(),
    images: z.array(image()).nullish(),
    budget: z.number().nullish(),
    impact: z.string().nullish(),
  }),
});

const reverends = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/reverends" }),
  schema: ({ image }) => z.object({
    ...seoFields,
    name: z.string(),
    role: z.string(),
    bio: z.string().nullish(),
    photo: image().optional(),
    email: z.string().nullish(),
    start_date: monthOrDate.pipe(z.date()),
    end_date: monthOrDate,
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    ...seoFields,
    title: z.string(),
    board_members: z.array(z.string()).nullish(),
    departments: z.array(z.object({ name: z.string(), description: z.string().nullish(), members: z.array(z.string()).default([]) })).nullish(),
    reverends: z.array(z.string()).nullish(),
    programs: z.array(z.string()).nullish(),
  }),
});

const site_seo = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/site-seo" }),
  schema: z.object(seoFields),
});

export const collections = {
  news,
  tags,
  authors,
  locations,
  events,
  board_members,
  programs,
  reverends,
  pages,
  site_seo,
};
