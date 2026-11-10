export const DEFAULT_PAGE_SIZE = 9;

export function paginateItems<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE): T[][] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  return Array.from({ length: totalPages }, (_, index) =>
    items.slice(index * pageSize, (index + 1) * pageSize),
  );
}
