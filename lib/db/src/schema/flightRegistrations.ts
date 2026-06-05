import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flightRegistrationsTable = pgTable("flight_registrations", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  flightNumber: text("flight_number").notNull(),
  flightDate: date("flight_date", { mode: "string" }).notNull(),
  passengerName: text("passenger_name"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFlightRegistrationSchema = createInsertSchema(
  flightRegistrationsTable
).omit({ id: true, registeredAt: true });

export type InsertFlightRegistration = z.infer<typeof insertFlightRegistrationSchema>;
export type FlightRegistration = typeof flightRegistrationsTable.$inferSelect;
