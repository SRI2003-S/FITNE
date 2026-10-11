import type { Food } from '@/types'

/**
 * Indian-context food database.
 *
 * Values are per 100 g (or 100 ml for liquids) and are APPROXIMATE, compiled
 * from publicly documented sources (IFCT-style composition tables and USDA
 * FoodData Central). They are suitable for tracking, not for clinical use.
 * Every entry carries a `source` so attribution stays honest.
 *
 * `state` matters: cooked rice is far less calorie-dense than dry rice. Mixed
 * homemade dishes are approximations and are labelled as such.
 */

interface Seed {
  id: string
  name: string
  category: string
  aliases?: string[]
  per100: [calories: number, protein: number, carbs: number, fat: number]
  fiber?: number
  state?: Food['state']
  source: string
  portions?: { label: string; grams: number }[]
}

const IFCT = 'IFCT 2017 (approx.)'
const USDA = 'USDA FoodData Central'
const CUSTOM = 'Home estimate (approx.)'

const SEED: Seed[] = [
  // Grains & staples
  { id: 'food-rice-cooked', name: 'White Rice (cooked)', category: 'Grains', aliases: ['rice', 'chawal'], per100: [130, 2.7, 28.2, 0.3], fiber: 0.4, state: 'cooked', source: USDA, portions: [{ label: '1 cup (~150 g)', grams: 150 }, { label: '1 bowl (~200 g)', grams: 200 }] },
  { id: 'food-rice-dry', name: 'White Rice (dry)', category: 'Grains', aliases: ['raw rice'], per100: [356, 6.8, 78, 0.6], state: 'raw', source: USDA, portions: [{ label: '1 cup (~180 g)', grams: 180 }] },
  { id: 'food-chapati', name: 'Chapati / Roti (atta)', category: 'Grains', aliases: ['roti', 'phulka'], per100: [260, 8.7, 45, 6.5], fiber: 6, state: 'cooked', source: CUSTOM, portions: [{ label: '1 medium chapati (~35 g)', grams: 35 }, { label: '1 large (~50 g)', grams: 50 }] },
  { id: 'food-atta', name: 'Whole-wheat Atta (dry)', category: 'Grains', aliases: ['wheat flour'], per100: [340, 12, 71, 2.5], fiber: 11, state: 'raw', source: IFCT },
  { id: 'food-oats', name: 'Oats (dry, rolled)', category: 'Grains', aliases: ['oats'], per100: [389, 16.9, 66.3, 6.9], fiber: 10.6, state: 'raw', source: USDA, portions: [{ label: '1 serving (~40 g)', grams: 40 }, { label: '60 g', grams: 60 }] },
  { id: 'food-bread-ww', name: 'Whole-wheat Bread', category: 'Grains', aliases: ['bread', 'brown bread'], per100: [247, 13, 41, 3.4], fiber: 6, state: 'as_sold', source: USDA, portions: [{ label: '1 slice (~30 g)', grams: 30 }] },
  { id: 'food-poha', name: 'Poha (cooked)', category: 'Breakfast', per100: [130, 2.6, 25.5, 2.7], state: 'cooked', source: CUSTOM, portions: [{ label: '1 plate (~180 g)', grams: 180 }] },
  { id: 'food-upma', name: 'Upma (cooked)', category: 'Breakfast', per100: [132, 3.2, 22, 3.4], state: 'cooked', source: CUSTOM, portions: [{ label: '1 plate (~180 g)', grams: 180 }] },
  { id: 'food-idli', name: 'Idli', category: 'Breakfast', per100: [130, 4.5, 25, 0.5], state: 'cooked', source: IFCT, portions: [{ label: '1 idli (~40 g)', grams: 40 }] },
  { id: 'food-dosa', name: 'Dosa (plain)', category: 'Breakfast', per100: [168, 4, 28, 5], state: 'cooked', source: IFCT, portions: [{ label: '1 dosa (~80 g)', grams: 80 }] },
  // Protein
  { id: 'food-chicken-breast', name: 'Chicken Breast (cooked, skinless)', category: 'Poultry', aliases: ['chicken'], per100: [165, 31, 0, 3.6], state: 'cooked', source: USDA, portions: [{ label: '200 g', grams: 200 }] },
  { id: 'food-chicken-curry', name: 'Chicken Curry (home)', category: 'Mixed dishes', aliases: ['chicken gravy'], per100: [135, 12, 4, 8], state: 'cooked', source: CUSTOM, portions: [{ label: '1 serving (~200 g)', grams: 200 }] },
  { id: 'food-fish-lean', name: 'Fish, Lean (cooked)', category: 'Fish', aliases: ['fish', 'rohu', 'machli'], per100: [130, 24, 0, 3.5], state: 'cooked', source: IFCT, portions: [{ label: '200 g', grams: 200 }] },
  { id: 'food-egg', name: 'Whole Egg', category: 'Eggs', aliases: ['egg', 'anda'], per100: [143, 12.6, 0.7, 9.5], state: 'cooked', source: USDA, portions: [{ label: '1 medium egg (~50 g)', grams: 50 }, { label: '1 large (~60 g)', grams: 60 }] },
  { id: 'food-egg-white', name: 'Egg White', category: 'Eggs', per100: [52, 11, 0.7, 0.2], state: 'cooked', source: USDA, portions: [{ label: '1 white (~33 g)', grams: 33 }] },
  { id: 'food-soy-chunks-dry', name: 'Soy Chunks (dry / TVP)', category: 'Legumes', aliases: ['soya chunks', 'meal maker', 'nutrela'], per100: [345, 52, 30, 1.5], fiber: 13, state: 'raw', source: USDA, portions: [{ label: '30 g dry (~100 g cooked)', grams: 30 }] },
  { id: 'food-paneer', name: 'Paneer', category: 'Dairy', per100: [296, 18.3, 3.4, 22.8], state: 'as_sold', source: IFCT, portions: [{ label: '50 g', grams: 50 }, { label: '100 g', grams: 100 }] },
  // Dairy
  { id: 'food-curd', name: 'Curd / Dahi (whole milk)', category: 'Dairy', aliases: ['yogurt', 'dahi'], per100: [98, 3.5, 4.7, 5.0], state: 'as_sold', source: IFCT, portions: [{ label: '1 bowl (~150 g)', grams: 150 }, { label: '200 g', grams: 200 }] },
  { id: 'food-milk', name: 'Milk (toned / full)', category: 'Dairy', aliases: ['doodh'], per100: [62, 3.3, 4.8, 3.4], state: 'as_sold', source: IFCT, portions: [{ label: '1 glass (~250 ml)', grams: 250 }, { label: '200 ml', grams: 200 }] },
  { id: 'food-tofu', name: 'Tofu', category: 'Legumes', per100: [76, 8, 1.9, 4.8], state: 'as_sold', source: USDA, portions: [{ label: '100 g', grams: 100 }] },
  // Legumes & pulses
  { id: 'food-dal-cooked', name: 'Dal / Lentils (cooked)', category: 'Legumes', aliases: ['daal', 'lentil', 'toor dal'], per100: [116, 7, 20, 0.4], fiber: 7.9, state: 'cooked', source: IFCT, portions: [{ label: '1 bowl (~150 g)', grams: 150 }] },
  { id: 'food-rajma-cooked', name: 'Rajma / Kidney Beans (cooked)', category: 'Legumes', per100: [127, 8.7, 22.8, 0.5], fiber: 6.4, state: 'cooked', source: USDA, portions: [{ label: '1 bowl (~150 g)', grams: 150 }] },
  { id: 'food-chole-cooked', name: 'Chickpeas / Chole (cooked)', category: 'Legumes', per100: [164, 8.9, 27.4, 2.6], fiber: 7.6, state: 'cooked', source: USDA, portions: [{ label: '1 bowl (~150 g)', grams: 150 }] },
  { id: 'food-roasted-chana', name: 'Roasted Chana (dry)', category: 'Snacks', aliases: ['bhuna chana', 'chana'], per100: [360, 20, 58, 5], fiber: 12, state: 'as_sold', source: IFCT, portions: [{ label: '30 g', grams: 30 }] },
  // Vegetables & fruit
  { id: 'food-veg-mixed', name: 'Mixed Vegetables (cooked)', category: 'Vegetables', aliases: ['sabzi'], per100: [55, 2.5, 8, 1.5], state: 'cooked', source: CUSTOM, portions: [{ label: '1 serving (~200 g)', grams: 200 }] },
  { id: 'food-potato', name: 'Potato (boiled)', category: 'Vegetables', aliases: ['aloo'], per100: [77, 2, 17, 0.1], state: 'cooked', source: USDA, portions: [{ label: '1 medium (~120 g)', grams: 120 }] },
  { id: 'food-banana', name: 'Banana', category: 'Fruit', aliases: ['kela'], per100: [89, 1.1, 22.8, 0.3], fiber: 2.6, state: 'as_sold', source: USDA, portions: [{ label: '1 medium (~118 g)', grams: 118 }] },
  { id: 'food-apple', name: 'Apple', category: 'Fruit', per100: [52, 0.3, 13.8, 0.2], state: 'as_sold', source: USDA, portions: [{ label: '1 medium (~180 g)', grams: 180 }] },
  // Fats & extras
  { id: 'food-oil', name: 'Cooking Oil (mustard / sunflower)', category: 'Fats', aliases: ['oil', 'tel'], per100: [884, 0, 0, 100], state: 'as_sold', source: USDA, portions: [{ label: '1 tsp (~5 g)', grams: 5 }, { label: '1 tbsp (~14 g)', grams: 14 }] },
  { id: 'food-ghee', name: 'Ghee', category: 'Fats', per100: [900, 0, 0, 100], state: 'as_sold', source: USDA, portions: [{ label: '1 tsp (~5 g)', grams: 5 }] },
  { id: 'food-almonds', name: 'Almonds', category: 'Nuts', aliases: ['badam'], per100: [579, 21.2, 21.6, 49.9], fiber: 12.5, state: 'as_sold', source: USDA, portions: [{ label: '10 almonds (~12 g)', grams: 12 }] },
  { id: 'food-peanuts', name: 'Peanuts (roasted)', category: 'Nuts', aliases: ['moongphali'], per100: [570, 26, 16, 49], state: 'as_sold', source: USDA, portions: [{ label: '30 g', grams: 30 }] },
  { id: 'food-besan-chilla', name: 'Besan Chilla', category: 'Breakfast', per100: [180, 8, 20, 7], state: 'cooked', source: CUSTOM, portions: [{ label: '1 chilla (~80 g)', grams: 80 }] },
]

export function buildFoodLibrary(): Food[] {
  const now = new Date().toISOString()
  return SEED.map((s) => ({
    id: s.id,
    name: s.name,
    aliases: s.aliases ?? [],
    category: s.category,
    perGrams: 100,
    calories: s.per100[0],
    protein: s.per100[1],
    carbs: s.per100[2],
    fat: s.per100[3],
    fiber: s.fiber,
    state: s.state ?? 'as_sold',
    commonPortions: s.portions ?? [],
    source: s.source,
    custom: false,
    createdAt: now,
    updatedAt: now,
  }))
}

/** Sample starter day — a template, clearly labelled, not a claim of exactness. */
export interface SampleMealItem {
  meal: string
  foodId: string
  grams: number
  label: string
}

export const SAMPLE_DAY: SampleMealItem[] = [
  { meal: 'breakfast', foodId: 'food-oats', grams: 60, label: 'Oats (dry)' },
  { meal: 'breakfast', foodId: 'food-milk', grams: 250, label: 'Milk' },
  { meal: 'breakfast', foodId: 'food-banana', grams: 118, label: 'Banana' },
  { meal: 'breakfast', foodId: 'food-egg', grams: 100, label: '2 whole eggs' },
  { meal: 'morning_snack', foodId: 'food-curd', grams: 200, label: 'Curd' },
  { meal: 'morning_snack', foodId: 'food-roasted-chana', grams: 30, label: 'Roasted chana' },
  { meal: 'lunch', foodId: 'food-chicken-breast', grams: 200, label: 'Chicken breast' },
  { meal: 'lunch', foodId: 'food-rice-cooked', grams: 250, label: 'Cooked rice' },
  { meal: 'lunch', foodId: 'food-dal-cooked', grams: 150, label: 'Dal' },
  { meal: 'lunch', foodId: 'food-veg-mixed', grams: 200, label: 'Vegetables' },
  { meal: 'lunch', foodId: 'food-oil', grams: 5, label: 'Cooking oil (1 tsp)' },
  { meal: 'pre_workout', foodId: 'food-banana', grams: 118, label: 'Banana' },
  { meal: 'pre_workout', foodId: 'food-bread-ww', grams: 60, label: '2 slices bread' },
  { meal: 'dinner', foodId: 'food-fish-lean', grams: 210, label: 'Lean fish' },
  { meal: 'dinner', foodId: 'food-chapati', grams: 105, label: '3 chapatis' },
  { meal: 'dinner', foodId: 'food-veg-mixed', grams: 200, label: 'Vegetables' },
  { meal: 'dinner', foodId: 'food-curd', grams: 150, label: 'Curd' },
  { meal: 'dinner', foodId: 'food-oil', grams: 5, label: 'Cooking oil (1 tsp)' },
]
