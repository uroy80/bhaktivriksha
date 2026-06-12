import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,15}$/, "Enter a valid phone number")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const adminSetupSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: emailSchema,
  password: passwordSchema,
  setupCode: z.string().min(1, "Setup code is required"),
});

export const applySchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  whatsapp: phoneSchema,
  address: z.string().trim().max(500).optional(),
  message: z.string().trim().max(2000).optional(),
});

export const levelApplySchema = z.object({
  levelId: z.string().min(1, "Choose a level"),
  message: z.string().trim().max(2000).optional(),
});

export const reviewApplicationSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().trim().max(1000).optional(),
  // for JOIN approvals the reviewer may assign a mentor and a starting level
  mentorId: z.string().optional(),
  levelId: z.string().optional(),
});

export const updateDevoteeSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: phoneSchema,
  whatsapp: phoneSchema,
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
  role: z.enum(["MISSIONARY", "DEVOTEE"]).optional(),
  mentorId: z.string().nullable().optional(),
  sadhanaLevelId: z.string().nullable().optional(),
});

export const sessionSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  type: z.enum(["SATSANGA", "CLASS", "OTHER"]),
  date: z.coerce.date(),
  location: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const attendanceMarkSchema = z.object({
  devoteeId: z.string().min(1),
  present: z.boolean(),
  remarks: z.string().trim().max(500).optional(),
});

export const followUpSchema = z.object({
  devoteeId: z.string().min(1),
  sessionId: z.string().optional(),
  channel: z.enum(["PHONE_CALL", "WHATSAPP", "EMAIL", "SMS", "HOME_VISIT", "IN_PERSON", "OTHER"]),
  outcome: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
  occurredAt: z.coerce.date().optional(),
});

export const progressReportSchema = z.object({
  period: z.enum(["DAILY", "WEEKLY"]),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  summary: z.string().trim().min(1, "Summary is required").max(5000),
  mails: z.coerce.number().int().min(0).default(0),
  calls: z.coerce.number().int().min(0).default(0),
  homeVisits: z.coerce.number().int().min(0).default(0),
  serviceDonors: z.coerce.number().int().min(0).default(0),
  moneyDonors: z.coerce.number().int().min(0).default(0),
});

export const sadhanaEntrySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  japaRounds: z.coerce.number().int().min(0).max(192).default(0),
  readingMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  mangalArati: z.coerce.boolean().default(false),
  eveningArati: z.coerce.boolean().default(false),
  lectureHeard: z.coerce.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
});
