import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, flightRegistrationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router: IRouter = Router();

const RegisterBody = z.object({
  deviceId: z.string().min(1).max(200),
  flightNumber: z.string().min(2).max(10),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  passengerName: z.string().max(100).optional(),
});

const UnregisterBody = z.object({
  deviceId: z.string().min(1).max(200),
  flightNumber: z.string().min(2).max(10),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.post("/flights/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  const { deviceId, flightNumber, flightDate, passengerName } = parsed.data;
  const fn = flightNumber.toUpperCase();

  await db
    .delete(flightRegistrationsTable)
    .where(
      and(
        eq(flightRegistrationsTable.deviceId, deviceId),
        eq(flightRegistrationsTable.flightNumber, fn),
        eq(flightRegistrationsTable.flightDate, flightDate)
      )
    );

  const [registration] = await db
    .insert(flightRegistrationsTable)
    .values({ deviceId, flightNumber: fn, flightDate, passengerName })
    .returning();

  res.status(201).json(registration);
});

router.delete("/flights/unregister", async (req, res) => {
  const parsed = UnregisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { deviceId, flightNumber, flightDate } = parsed.data;
  await db
    .delete(flightRegistrationsTable)
    .where(
      and(
        eq(flightRegistrationsTable.deviceId, deviceId),
        eq(flightRegistrationsTable.flightNumber, flightNumber.toUpperCase()),
        eq(flightRegistrationsTable.flightDate, flightDate)
      )
    );

  res.json({ success: true });
});

router.get("/flights/:flightNumber/passengers", async (req, res) => {
  const flightNumber = req.params.flightNumber.toUpperCase();
  const date = req.query.date as string;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Missing or invalid date query parameter (YYYY-MM-DD)" });
    return;
  }

  const registrations = await db
    .select()
    .from(flightRegistrationsTable)
    .where(
      and(
        eq(flightRegistrationsTable.flightNumber, flightNumber),
        eq(flightRegistrationsTable.flightDate, date)
      )
    );

  const names = registrations
    .filter((r) => r.passengerName)
    .map((r) => r.passengerName!)
    .slice(0, 5);

  res.json({
    flightNumber,
    flightDate: date,
    count: registrations.length,
    names,
  });
});

export default router;
