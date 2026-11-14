export interface CardItem {
  title: string;
  href?: string;
  rel?: string;
  dateLabel?: string;
  datePrecision?: "day" | "month";
  dateStyle?: "news";
  description?: string | null;
  date?: Date;
  endDate?: Date | null;
  dateTimeZone?: string;
  image?: { src: string; alt: string };
}
