import type { Equipment, Exercise, MuscleGroup } from '@/types'

interface SeedExercise {
  id: string
  name: string
  muscle: MuscleGroup
  equipment: Equipment
  aliases?: string[]
  secondary?: MuscleGroup[]
  compound?: boolean
  instructions: string
}

const SEED: SeedExercise[] = [
  { id: 'ex-squat', name: 'Competition Squat', muscle: 'quads', equipment: 'barbell', compound: true, aliases: ['back squat', 'barbell squat'], secondary: ['glutes', 'hamstrings', 'core'], instructions: 'Bar on upper traps, brace hard, sit between the hips, drive the floor away. Depth to parallel or below.' },
  { id: 'ex-paused-squat', name: 'Paused Squat', muscle: 'quads', equipment: 'barbell', compound: true, secondary: ['glutes'], instructions: 'Squat down and hold 2–3 s in the hole before standing. Builds position and control.' },
  { id: 'ex-hack-squat', name: 'Hack Squat', muscle: 'quads', equipment: 'machine', compound: true, secondary: ['glutes'], instructions: 'Back flat against pad, lower under control to a comfortable depth, press through mid-foot.' },
  { id: 'ex-rdl', name: 'Romanian Deadlift', muscle: 'hamstrings', equipment: 'barbell', compound: true, aliases: ['RDL'], secondary: ['glutes', 'back'], instructions: 'Hinge at the hips, soft knees, push hips back until a hamstring stretch, keep the bar close.' },
  { id: 'ex-deadlift', name: 'Competition Deadlift', muscle: 'hamstrings', equipment: 'barbell', compound: true, aliases: ['deadlift', 'conventional deadlift'], secondary: ['glutes', 'back', 'core'], instructions: 'Bar over mid-foot, brace, pull the slack out, push the floor away and lock out hips and knees together.' },
  { id: 'ex-paused-deadlift', name: 'Paused Deadlift', muscle: 'back', equipment: 'barbell', compound: true, secondary: ['hamstrings', 'glutes'], instructions: 'Pause just below the knee for 1–2 s, then finish the pull. Keep the back locked.' },
  { id: 'ex-leg-press', name: 'Leg Press', muscle: 'quads', equipment: 'machine', compound: true, secondary: ['glutes'], instructions: 'Feet shoulder-width on the platform, lower until knees reach ~90°, press without locking out hard.' },
  { id: 'ex-leg-curl', name: 'Lying Leg Curl', muscle: 'hamstrings', equipment: 'machine', instructions: 'Curl the pad toward the glutes, control the return, avoid lifting the hips.' },
  { id: 'ex-seated-leg-curl', name: 'Seated Leg Curl', muscle: 'hamstrings', equipment: 'machine', instructions: 'Drive the pad down with the hamstrings, keep the torso pinned.' },
  { id: 'ex-calf-raise-standing', name: 'Standing Calf Raise', muscle: 'calves', equipment: 'machine', instructions: 'Full stretch at the bottom, rise onto the balls of the feet, pause at the top.' },
  { id: 'ex-calf-raise-seated', name: 'Seated Calf Raise', muscle: 'calves', equipment: 'machine', instructions: 'Knees bent, press the pads up through the balls of the feet, slow eccentric.' },
  { id: 'ex-leg-extension', name: 'Leg Extension', muscle: 'quads', equipment: 'machine', instructions: 'Extend the knees fully, squeeze the quads, control the descent.' },
  { id: 'ex-bulgarian-split-squat', name: 'Bulgarian Split Squat', muscle: 'quads', equipment: 'dumbbell', compound: true, secondary: ['glutes'], instructions: 'Rear foot elevated, drop straight down, drive through the front foot. Log per leg.' },
  { id: 'ex-hip-thrust', name: 'Hip Thrust', muscle: 'glutes', equipment: 'barbell', compound: true, secondary: ['hamstrings'], instructions: 'Upper back on a bench, drive hips to full extension, squeeze glutes at the top.' },
  { id: 'ex-back-extension', name: 'Back Extension', muscle: 'back', equipment: 'bodyweight', instructions: 'Hinge at the hips over the pad, extend the spine to neutral, avoid hyperextension.' },
  { id: 'ex-cable-crunch', name: 'Cable Crunch', muscle: 'core', equipment: 'cable', instructions: 'Kneel facing the stack, crunch the elbows toward the knees using the abs.' },
  { id: 'ex-hanging-knee-raise', name: 'Hanging Knee Raise', muscle: 'core', equipment: 'bodyweight', instructions: 'Hang from a bar, raise the knees with control, avoid swinging.' },
  { id: 'ex-plank', name: 'Plank', muscle: 'core', equipment: 'bodyweight', instructions: 'Elbows under shoulders, keep a straight line from head to heels, brace and breathe.' },
  { id: 'ex-bench', name: 'Competition Bench Press', muscle: 'chest', equipment: 'barbell', compound: true, aliases: ['bench press', 'bench'], secondary: ['triceps', 'shoulders'], instructions: 'Shoulder blades pinned, touch the lower chest, pause, press up and slightly back.' },
  { id: 'ex-paused-bench', name: 'Paused Bench Press', muscle: 'chest', equipment: 'barbell', compound: true, secondary: ['triceps', 'shoulders'], instructions: 'Full stop on the chest for 1–2 s, then press explosively.' },
  { id: 'ex-barbell-row', name: 'Barbell Row', muscle: 'back', equipment: 'barbell', compound: true, aliases: ['row', 'bent over row'], secondary: ['biceps'], instructions: 'Hinge to ~45°, pull the bar to the lower ribs, control the lowering.' },
  { id: 'ex-seated-cable-row', name: 'Seated Cable Row', muscle: 'back', equipment: 'cable', compound: true, secondary: ['biceps'], instructions: 'Sit tall, pull the handle to the sternum, squeeze the shoulder blades together.' },
  { id: 'ex-incline-db-press', name: 'Incline Dumbbell Press', muscle: 'chest', equipment: 'dumbbell', compound: true, secondary: ['shoulders', 'triceps'], instructions: 'Bench at 30°, press the dumbbells up and slightly together, control the descent.' },
  { id: 'ex-machine-chest-press', name: 'Machine Chest Press', muscle: 'chest', equipment: 'machine', compound: true, secondary: ['triceps'], instructions: 'Handles at mid-chest, press without shrugging, controlled return.' },
  { id: 'ex-lat-pulldown', name: 'Lat Pulldown', muscle: 'back', equipment: 'cable', compound: true, secondary: ['biceps'], instructions: 'Pull the bar to the upper chest, lead with the elbows, avoid leaning back excessively.' },
  { id: 'ex-neutral-lat-pulldown', name: 'Neutral-Grip Lat Pulldown', muscle: 'back', equipment: 'cable', compound: true, secondary: ['biceps'], instructions: 'Use a neutral handle, pull to the chest, drive the elbows down.' },
  { id: 'ex-pullup', name: 'Pull-Up', muscle: 'back', equipment: 'bodyweight', compound: true, secondary: ['biceps'], instructions: 'Hang, pull until the chin clears the bar, control the descent. Add load when reps exceed target.' },
  { id: 'ex-lateral-raise', name: 'Lateral Raise', muscle: 'shoulders', equipment: 'dumbbell', instructions: 'Raise to shoulder height with a slight elbow bend, lead with the elbows, control down.' },
  { id: 'ex-rear-delt-fly', name: 'Rear-Delt Fly', muscle: 'shoulders', equipment: 'dumbbell', instructions: 'Hinge slightly, raise the dumbbells out to the sides, think about the rear delts.' },
  { id: 'ex-face-pull', name: 'Face Pull', muscle: 'shoulders', equipment: 'cable', instructions: 'Rope at eye level, pull toward the face and separate the hands, squeeze the rear delts.' },
  { id: 'ex-triceps-pushdown', name: 'Triceps Pushdown', muscle: 'triceps', equipment: 'cable', instructions: 'Elbows pinned to the sides, extend to a full lockout, control the return.' },
  { id: 'ex-overhead-triceps', name: 'Overhead Triceps Extension', muscle: 'triceps', equipment: 'cable', instructions: 'Elbows high, extend overhead, keep the upper arms still.' },
  { id: 'ex-ez-curl', name: 'EZ-Bar Curl', muscle: 'biceps', equipment: 'ez-bar', instructions: 'Elbows at the sides, curl to the top, control the lowering.' },
  { id: 'ex-reverse-curl', name: 'Reverse Curl', muscle: 'biceps', equipment: 'ez-bar', instructions: 'Overhand grip, curl with the elbows pinned, emphasises the forearms.' },
  { id: 'ex-wrist-curl', name: 'Wrist Curl', muscle: 'biceps', equipment: 'dumbbell', instructions: 'Forearms supported, curl the wrists through a full range.' },
]

export function buildExerciseLibrary(): Exercise[] {
  const now = new Date().toISOString()
  return SEED.map((e) => ({
    id: e.id,
    name: e.name,
    aliases: e.aliases ?? [],
    muscle: e.muscle,
    secondaryMuscles: e.secondary ?? [],
    equipment: e.equipment,
    instructions: e.instructions,
    custom: false,
    isCompound: e.compound ?? false,
    createdAt: now,
    updatedAt: now,
  }))
}
