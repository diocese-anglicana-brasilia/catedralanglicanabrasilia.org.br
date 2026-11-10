export interface CardItem {
  title: string;
  href: string;
  description?: string | null;
  date?: Date;
  image?: { src: string; alt: string };
}
