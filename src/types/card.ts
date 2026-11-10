export interface CardItem {
  title: string;
  href: string;
  description?: string | null;
  date?: Date;
  endDate?: Date | null;
  dateTimeZone?: string;
  image?: { src: string; alt: string };
}
