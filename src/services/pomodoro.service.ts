import * as pomodoroRepository from '../repositories/pomodoro.repository';
import { tipo_sesion_pomodoro_enum } from '../data/dataTypes';

export const logPomodoroSession = (
  userId: number,
  durationMinutes: number,
  sessionType: tipo_sesion_pomodoro_enum,
  itemId?: number | null
) => {
  // Add any business logic/validation here if needed
  if (durationMinutes <= 0) {
    throw new Error('Duration must be positive.');
  }
  return pomodoroRepository.logSession(userId, durationMinutes, sessionType, itemId);
};