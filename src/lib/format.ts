import type { Units } from '@/types'
import { round } from './utils'

export function kgToLb(kg: number): number {
  return kg * 2.2046226218
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218
}

export function cmToIn(cm: number): number {
  return cm / 2.54
}

export function formatWeight(
  kg: number | null | undefined,
  units: Units = 'metric',
  decimals = 1,
): string {
  if (kg == null || Number.isNaN(kg)) return '—'
  const value = units === 'imperial' ? kgToLb(kg) : kg
  const unit = units === 'imperial' ? 'lb' : 'kg'
  return `${round(value, decimals).toLocaleString()} ${unit}`
}

export function formatWeightValue(kg: number | null | undefined, units: Units = 'metric'): number | null {
  if (kg == null) return null
  return units === 'imperial' ? round(kgToLb(kg), 1) : round(kg, 1)
}

export function formatHeight(cm: number | null | undefined): string {
  if (cm == null) return '—'
  return `${round(cm, 0)} cm`
}

export function formatCalories(kcal: number): string {
  return `${Math.round(kcal).toLocaleString()} kcal`
}

export function formatGrams(g: number): string {
  return `${Math.round(g)} g`
}

export function formatMacro(g: number): string {
  return `${Math.round(g)}g`
}

export function formatSigned(value: number, decimals = 1, unit = ''): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${round(value, decimals).toLocaleString()}${unit ? ` ${unit}` : ''}`
}

export function formatPercent(value: number, decimals = 0): string {
  return `${round(value, decimals)}%`
}

export function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}
