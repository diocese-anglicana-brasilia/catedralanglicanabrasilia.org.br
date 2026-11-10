import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
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
    name: z.string(),
    map_location: z.string().nullish(),
    jurisdiction: z.string().nullish(),
    address: z.string().nullish(),
    city: z.string().nullish(),
    capacity: z.number().nullish(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: z.object({
    name: z.string(),
    date: z.coerce.date(),
    location: z.string().nullish(),
    description: z.string().nullish(),
    registration_url: z.string().nullish(),
    featured: z.boolean().default(false),
  }),
});

const board_members = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/board-members" }),
  schema: ({ image }) => z.object({
    name: z.string(),
    role: z.string(),
    bio: z.string().nullish(),
    photo: image().optional(),
    email: z.string().nullish(),
  }),
});

const programs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/programs" }),
  schema: ({ image }) => z.object({
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
    name: z.string(),
    role: z.string(),
    bio: z.string().nullish(),
    photo: image().optional(),
    email: z.string().nullish(),
    start_date: z.coerce.date(),
    end_date: z.coerce.date().nullish(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    board_members: z.array(z.string()).nullish(),
    reverends: z.array(z.string()).nullish(),
    programs: z.array(z.string()).nullish(),
  }),
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
};
