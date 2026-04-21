/**
 * Reuse: edit routes here + mirror `next.config.ts` rewrites + `src/app/api/[[...slug]]/route.ts`.
 */
export const BOOKING_ROUTES = {
  list: "/appointments",
  create: "/book-appointment",
  item: (id: string) => `/api/appointments/${id}`,
  pollMs: 5000,
} as const;

export const BOOKING_FIELDS = [
  "name",
  "phone",
  "service",
  "date",
  "time",
  "city",
] as const;
