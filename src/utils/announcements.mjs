const normalPath = (value) => value === "/" ? "/" : value.replace(/\/+$/, "");

export function selectAnnouncements(notices, pathname, now = Date.now()) {
  const candidates = notices.filter((item) => item.status === "published"
    && (!item.start || Date.parse(item.start) <= now)
    && (!item.end || Date.parse(item.end) > now)
    && (!item.paths?.length || item.paths.some((path) => normalPath(path) === normalPath(pathname))));
  candidates.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  return ["banner", "modal"].flatMap((type) => candidates.find((item) => item.type === type) || []);
}
