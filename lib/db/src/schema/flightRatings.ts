import { pgTable, text, serial, smallint, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flightRatingsTable = pgTable(
  "flight_ratings",
  {
    id: serial("id").primaryKey(),
    deviceId: text("device_id").notNull(),
    flightNumber: text("flight_number").notNull(),
    flightDate: date("flight_date", { mode: "string" }).notNull(),
    iataCode: text("iata_code"),
    rating: smallint("rating").notNull(),
    ratedAt: timestamp("rated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_flight_rating_device").on(t.deviceId, t.flightNumber, t.flightDate)]
);

export const insertFlightRatingSchema = createInsertSchema(flightRatingsTable).omit({
  id: true,
  ratedAt: true,
});

export type InsertFlightRating = z.infer<typeof insertFlightRatingSchema>;
export type FlightRating = typeof flightRatingsTable.$inferSelect;
