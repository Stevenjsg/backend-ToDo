import * as userRepository from '../repositories/user.repository';

export const getUserProfile = async (userId: number) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  return user;
};

export const updateUserProfile = async (userId: number, data: { nombre_completo?: string; bio?: string }) => {
  // Aquí podrías añadir validaciones (ej. longitud del nombre)
  const updatedUser = await userRepository.update(userId, data);
  return updatedUser;
};

// --- Resumen del perfil (Design System v3) --------------------------------

const DAY_MS = 86_400_000;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Racha de días seguidos con al menos un pomodoro de trabajo, contando hacia
 * atrás desde hoy. Si hoy aún no hay sesión, la racha puede empezar ayer
 * (todavía no está "rota").
 */
const computeStreak = (focusDays: string[]): number => {
  const days = new Set(focusDays);
  const today = new Date();
  let cursor = days.has(isoDay(today)) ? today : new Date(today.getTime() - DAY_MS);
  let streak = 0;
  while (days.has(isoDay(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
};

/**
 * Todo lo que la vista de perfil necesita en una sola petición: totales de
 * trabajo, racha, grupos con rol y avance, y pomodoros por día (14 días,
 * huecos rellenos a cero).
 */
export const getUserSummary = async (userId: number) => {
  const [totals, focusDays, daily, grupos] = await Promise.all([
    userRepository.getWorkTotals(userId),
    userRepository.getFocusDays(userId),
    userRepository.getDailyPomodoros(userId),
    userRepository.getGroupsSummary(userId),
  ]);

  const byDay = new Map(daily.map((d) => [d.dia, d.pomodoros]));
  const today = new Date();
  const actividad = Array.from({ length: 14 }, (_, i) => {
    const dia = isoDay(new Date(today.getTime() - (13 - i) * DAY_MS));
    return { dia, pomodoros: byDay.get(dia) ?? 0 };
  });

  return {
    stats: {
      pomodoros: totals.pomodoros,
      minutos: totals.minutos,
      bloques_hechos: totals.bloques_hechos,
      racha_dias: computeStreak(focusDays),
    },
    grupos,
    actividad,
  };
};