import { Request, Response } from 'express';
import * as pomodoroService from '../../services/pomodoro.service';
import { tipo_sesion_pomodoro_enum } from '../../data/dataTypes';

export const logSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { durationMinutes, sessionType, itemId } = req.body;

    // Basic validation
    if (!durationMinutes || !sessionType) {
      return res.status(400).json({ message: 'durationMinutes and sessionType are required.' });
    }
    if (!['trabajo', 'descanso_corto', 'descanso_largo'].includes(sessionType)) {
        return res.status(400).json({ message: 'Invalid sessionType.' });
    }

    const loggedSession = await pomodoroService.logPomodoroSession(
      userId,
      durationMinutes,
      sessionType as tipo_sesion_pomodoro_enum,
      itemId
    );

    res.status(201).json(loggedSession);
  } catch (error: any) {
    res.status(500).json({ message: 'Error logging Pomodoro session', error: error.message });
  }
};