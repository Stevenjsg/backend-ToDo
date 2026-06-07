import * as reminderRepository from "../repositories/reminder.repository";

// Recordatorios con vencimiento futuro (para mostrar/agendar en el front).
export const getUpcomingReminders = (userId: number) =>
  reminderRepository.findUpcoming(userId);

// Recordatorios ya vencidos y sin completar (para que el front avise).
export const getDueReminders = (userId: number) =>
  reminderRepository.findDue(userId);
