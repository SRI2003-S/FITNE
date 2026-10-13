import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ImagePlus, Lock, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { db } from '@/db/db'
import { addProgressPhoto, deleteProgressPhoto } from '@/db/repos'
import { uploadProgressPhoto } from '@/lib/cloudPhotos'
import { isCloudEnabled } from '@/lib/supabase'
import { formatDate, todayKey } from '@/lib/date'
import { toast } from '@/store/ui'
import type { PhotoView, ProgressPhoto } from '@/types'
import { cn } from '@/lib/utils'

function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function PhotoTile({ photo, onClick, selected }: { photo: ProgressPhoto; onClick: () => void; selected?: boolean }) {
  const url = useObjectUrl(photo.blob)
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative aspect-[3/4] overflow-hidden rounded-xl border bg-surface-2',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border',
      )}
    >
      {url ? (
        <img src={url} alt={`${photo.view} ${photo.date}`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <ImagePlus className="h-6 w-6" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left">
        <div className="text-[11px] font-semibold text-white">{formatDate(photo.date)}</div>
        <div className="text-[10px] capitalize text-white/70">
          {photo.view}
          {photo.weightKg ? ` · ${photo.weightKg} kg` : ''}
        </div>
      </div>
    </button>
  )
}

export function PhotosScreen() {
  const photos = useLiveQuery(() => db.progressPhotos.orderBy('date').reverse().toArray(), [])
  const [addOpen, setAddOpen] = useState(false)
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)
  const [slider, setSlider] = useState(50)

  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [view, setView] = useState<PhotoView>('front')
  const [date, setDate] = useState(todayKey())
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')

  function resetForm() {
    setPreview(null)
    setBlob(null)
    setView('front')
    setDate(todayKey())
    setWeight('')
    setNote('')
  }

  function onFile(file: File | undefined) {
    if (!file) return
    const b = file.slice(0, file.size, file.type)
    setBlob(b)
    setPreview(URL.createObjectURL(b))
  }

  async function save() {
    if (!blob) {
      toast.error('Choose a photo first')
      return
    }
    let storagePath: string | null = null
    if (isCloudEnabled()) {
      toast.info('Uploading to cloud...')
      storagePath = await uploadProgressPhoto(blob, { date, view })
    }
    await addProgressPhoto({
      date,
      view,
      weightKg: weight ? Number(weight) : null,
      note,
      tags: [view],
      blob,
      storagePath,
    })
    toast.success(
      storagePath
        ? 'Photo saved locally and to the cloud'
        : 'Photo saved privately on this device',
    )
    resetForm()
    setAddOpen(false)
  }

  const byDate = useMemo(() => {
    const groups = new Map<string, ProgressPhoto[]>()
    for (const p of photos ?? []) {
      const list = groups.get(p.date) ?? []
      list.push(p)
      groups.set(p.date, list)
    }
    return [...groups.entries()]
  }, [photos])

  const photoA = (photos ?? []).find((p) => p.id === compareA)
  const photoB = (photos ?? []).find((p) => p.id === compareB)
  const urlA = useObjectUrl(photoA?.blob)
  const urlB = useObjectUrl(photoB?.blob)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Physique"
        subtitle="Private progress photos — stored locally, never uploaded by default"
        actions={
          <Button size="sm" leftIcon={<Camera className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            Add photo
          </Button>
        }
      />

      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0 text-success" />
        Photos stay in this device’s IndexedDB. They are not sent to AI and use no public URLs.
      </div>

      {(photos?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Camera className="h-6 w-6" />}
          title="Start your physique timeline"
          description="Take front, side and back photos in consistent light, distance and posture. Weekly or monthly comparisons beat day-to-day judging."
          action={
            <Button onClick={() => setAddOpen(true)} leftIcon={<ImagePlus className="h-4 w-4" />}>
              Add first photo
            </Button>
          }
        />
      ) : (
        <>
          {photoA && photoB && urlA && urlB && (
            <Card>
              <CardContent>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-bold">Compare</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(photoA.date)} → {formatDate(photoB.date)}
                  </div>
                </div>
                <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl border border-border">
                  <img src={urlA} alt="before" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${slider}%` }}>
                    <img
                      src={urlB}
                      alt="after"
                      className="h-full object-cover"
                      style={{ width: `${100 / (slider / 100)}%`, maxWidth: 'none' }}
                    />
                  </div>
                  <div className="absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${slider}%` }} />
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={slider}
                  onChange={(e) => setSlider(Number(e.target.value))}
                  className="mt-3 w-full accent-[var(--primary)]"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{formatDate(photoA.date)}</span>
                  <span>{formatDate(photoB.date)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {byDate.map(([d, list]) => (
              <div key={d}>
                <div className="mb-2 text-sm font-semibold text-muted-foreground">{formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div className="grid grid-cols-3 gap-2">
                  {list.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <PhotoTile
                        photo={p}
                        selected={compareA === p.id || compareB === p.id}
                        onClick={() => {
                          if (!compareA || (compareA && compareB)) {
                            setCompareA(p.id)
                            setCompareB(null)
                          } else {
                            setCompareB(p.id)
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          void deleteProgressPhoto(p.id)
                          toast.info('Photo deleted')
                        }}
                        className="flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[11px] text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Tip: select two photos to open the overlay comparison.
          </p>
        </>
      )}

      <Dialog
        open={addOpen}
        onClose={() => {
          resetForm()
          setAddOpen(false)
        }}
        title="Add progress photo"
        description="Consistent lighting, distance and posture make comparisons meaningful."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save privately</Button>
          </>
        }
      >
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[3/4] w-full max-w-[220px] mx-auto items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface-2"
          >
            {preview ? (
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-7 w-7" />
                <span className="text-xs font-semibold">Take or choose photo</span>
              </span>
            )}
          </button>

          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">View</div>
            <div className="flex gap-2">
              {(['front', 'side', 'back'] as PhotoView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-xs font-semibold capitalize',
                    view === v ? 'border-primary bg-primary/12 text-primary' : 'border-border bg-surface-2 text-muted-foreground',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="optional"
                className="h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lighting, posture, how you feel…"
              className="h-11 w-full rounded-xl border border-input bg-surface-2 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          {view && <Badge tone="neutral">No AI analysis · no body-fat inference</Badge>}
        </div>
      </Dialog>
    </div>
  )
}
