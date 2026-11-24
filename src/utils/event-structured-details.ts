interface EventDetails {
  event_status?: "scheduled" | "cancelled" | "postponed" | null;
  image?: string | null;
  organizer_name?: string | null;
  organizer_url?: string | null;
  performer_name?: string | null;
  performer_type?: "Person" | "PerformingGroup" | null;
  admission_price?: number | null;
}

export function eventStructuredDetails(data: EventDetails) {
  const statuses = { scheduled: "EventScheduled", cancelled: "EventCancelled", postponed: "EventPostponed" } as const;
  return {
    ...(data.event_status && { eventStatus: `https://schema.org/${statuses[data.event_status]}` }),
    ...(data.image && { image: data.image }),
    ...(data.organizer_name && { organizer: { "@type": "Organization", name: data.organizer_name, ...(data.organizer_url && { url: data.organizer_url }) } }),
    ...(data.performer_name && data.performer_type && { performer: { "@type": data.performer_type, name: data.performer_name } }),
    ...(data.admission_price != null && { offers: { "@type": "Offer", price: data.admission_price, priceCurrency: "BRL" } }),
  };
}
