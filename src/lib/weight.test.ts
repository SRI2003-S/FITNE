import { describe, expect, it } from 'vitest'
import { movingAverage, summarizeWeight, trendKgPerWeek, weeklyAverages } from './weight'

const points = [
  { date: '2026-01-01', weightKg: 90 },
  { date: '2026-01-02', weightKg: 89.6 },
  { date: '2026-01-03', weightKg: 89.8 },
  { date: '2026-01-08', weightKg: 89.0 },
  { date: '2026-01-09', weightKg: 88.8 },
]

describe('weight trends', () => {
  it('builds a trailing moving average', () => {
    const ma = movingAverage(points, 7)
    expect(ma).toHaveLength(5)
    expect(ma[0].weightKg).toBeCloseTo(90)
  })

  it('computes negative weekly trend for fat loss', () => {
    const slope = trendKgPerWeek(points)
    expect(slope).not.toBeNull()
    expect(slope as number).toBeLessThan(0)
  })

  it('groups into weekly averages', () => {
    const weeks = weeklyAverages(points, 1)
    expect(weeks.length).toBeGreaterThanOrEqual(2)
  })

  it('summarises latest and total change', () => {
    const s = summarizeWeight(points, '2026-01-09')
    expect(s.latest?.weightKg).toBe(88.8)
    expect(s.totalChangeKg).toBeCloseTo(-1.2)
    expect(s.direction).toBe('down')
  })

  it('handles empty input safely', () => {
    const s = summarizeWeight([], '2026-01-09')
    expect(s.latest).toBeNull()
    expect(s.direction).toBe('unknown')
  })
})
