import type { WorkoutTemplate, WorkoutTemplateExercise } from '@/types'

function ex(
  exerciseId: string,
  name: string,
  sets: number,
  repsLow: number,
  repsHigh: number,
  restSeconds: number,
  opts: Partial<WorkoutTemplateExercise> = {},
): WorkoutTemplateExercise {
  return { exerciseId, name, sets, repsLow, repsHigh, restSeconds, ...opts }
}

const UPPER_REST = 120
const LOWER_REST = 150
const MAIN_REST = 180

/**
 * The default five-day powerlifting + bodybuilding split.
 * Weekday: 1 = Monday ... 0 = Sunday.
 */
export function buildSplitTemplates(): WorkoutTemplate[] {
  const now = new Date().toISOString()
  const base = { active: 1 as const, createdAt: now, updatedAt: now }

  return [
    {
      ...base,
      id: 'tpl-mon',
      name: 'Squat Strength + Legs',
      weekday: 1,
      description: 'Main lift: competition squat. Top set of 3–5, then back-off work.',
      exercises: [
        ex('ex-squat', 'Competition Squat', 4, 4, 5, MAIN_REST, {
          mainLift: 'squat',
          note: '1 top set of 3–5 reps, then 3 back-off sets of 4.',
        }),
        ex('ex-rdl', 'Romanian Deadlift', 3, 6, 8, LOWER_REST),
        ex('ex-leg-press', 'Leg Press', 3, 8, 12, LOWER_REST),
        ex('ex-leg-curl', 'Lying Leg Curl', 3, 10, 15, 90),
        ex('ex-calf-raise-standing', 'Standing Calf Raise', 3, 10, 15, 75),
        ex('ex-cable-crunch', 'Cable Crunch', 3, 10, 15, 75),
      ],
    },
    {
      ...base,
      id: 'tpl-tue',
      name: 'Bench Strength + Upper',
      weekday: 2,
      description: 'Main lift: competition bench. Top set of 3–5, then back-off work.',
      exercises: [
        ex('ex-bench', 'Competition Bench Press', 4, 4, 5, MAIN_REST, {
          mainLift: 'bench',
          note: '1 top set of 3–5 reps, then 3 back-off sets of 4.',
        }),
        ex('ex-barbell-row', 'Barbell Row', 4, 6, 10, UPPER_REST),
        ex('ex-incline-db-press', 'Incline Dumbbell Press', 3, 8, 12, UPPER_REST),
        ex('ex-lat-pulldown', 'Lat Pulldown', 3, 8, 12, 90),
        ex('ex-lateral-raise', 'Lateral Raise', 3, 12, 20, 60),
        ex('ex-triceps-pushdown', 'Triceps Pushdown', 3, 10, 15, 60),
      ],
    },
    {
      ...base,
      id: 'tpl-wed',
      name: 'Recovery',
      weekday: 3,
      isRestDay: true,
      description: 'Easy walking or cycling 15–25 min. Optional mobility. No mandatory heavy lifting.',
      exercises: [
        ex('ex-plank', 'Optional Mobility / Plank', 3, 45, 60, 60, { optional: true, note: 'Seconds, not reps. Skip if fatigued.' }),
      ],
    },
    {
      ...base,
      id: 'tpl-thu',
      name: 'Deadlift Strength',
      weekday: 4,
      description: 'Main lift: competition deadlift. Top set of 3–4, then back-off triples.',
      exercises: [
        ex('ex-deadlift', 'Competition Deadlift', 4, 3, 4, MAIN_REST, {
          mainLift: 'deadlift',
          note: '1 top set of 3–4 reps, then 3 back-off sets of 3.',
        }),
        ex('ex-paused-deadlift', 'Paused Deadlift (technique)', 2, 3, 3, 150, {
          optional: true,
          note: 'Optional — remove when fatigue is high.',
        }),
        ex('ex-seated-leg-curl', 'Seated Leg Curl', 3, 10, 15, 90),
        ex('ex-back-extension', 'Back Extension', 2, 10, 15, 75),
        ex('ex-hanging-knee-raise', 'Hanging Knee Raise', 3, 10, 15, 60),
      ],
    },
    {
      ...base,
      id: 'tpl-fri',
      name: 'Upper Hypertrophy + Bench Volume',
      weekday: 5,
      description: 'Paused bench volume, then balanced upper-body hypertrophy.',
      exercises: [
        ex('ex-paused-bench', 'Paused Bench Press', 4, 5, 6, UPPER_REST),
        ex('ex-seated-cable-row', 'Seated Cable Row', 3, 8, 12, 90),
        ex('ex-machine-chest-press', 'Machine Chest Press', 3, 8, 12, 90),
        ex('ex-neutral-lat-pulldown', 'Neutral-Grip Lat Pulldown', 3, 10, 12, 75),
        ex('ex-rear-delt-fly', 'Rear-Delt Fly', 3, 12, 20, 60),
        ex('ex-ez-curl', 'EZ-Bar Curl', 3, 8, 12, 60),
        ex('ex-overhead-triceps', 'Overhead Triceps Extension', 2, 10, 15, 60),
        ex('ex-reverse-curl', 'Reverse Curl', 2, 12, 20, 45),
      ],
    },
    {
      ...base,
      id: 'tpl-sat',
      name: 'Legs Hypertrophy',
      weekday: 6,
      description: 'Higher-rep lower body work with a paused/hack squat main.',
      exercises: [
        ex('ex-paused-squat', 'Paused / Hack Squat', 3, 5, 8, LOWER_REST),
        ex('ex-bulgarian-split-squat', 'Bulgarian Split Squat', 3, 8, 12, 90, { note: 'Per leg.' }),
        ex('ex-hip-thrust', 'Hip Thrust', 3, 8, 12, LOWER_REST),
        ex('ex-seated-leg-curl', 'Seated Leg Curl', 3, 10, 15, 90),
        ex('ex-leg-extension', 'Leg Extension', 2, 12, 15, 75),
        ex('ex-calf-raise-seated', 'Seated Calf Raise', 4, 12, 20, 60),
        ex('ex-plank', 'Plank', 3, 45, 60, 60, { note: 'Seconds, not reps.' }),
      ],
    },
    {
      ...base,
      id: 'tpl-sun',
      name: 'Rest',
      weekday: 0,
      isRestDay: true,
      description: 'Full rest. Optional comfortable walking. Weekly review and next-week preparation.',
      exercises: [],
    },
  ]
}
