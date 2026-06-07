import { Request, Response } from "express";
import * as reminderService from "../../services/reminder.service";

// GET /api/reminders/upcoming — recordatorios con vencimiento futuro
export const getUpcoming = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const reminders = await reminderService.getUpcomingReminders(userId);
    res.status(200).json(reminders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching upcoming reminders" });
  }
};

// GET /api/reminders/due — recordatorios ya vencidos y sin completar
export const getDue = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const reminders = await reminderService.getDueReminders(userId);
    res.status(200).json(reminders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching due reminders" });
  }
};
