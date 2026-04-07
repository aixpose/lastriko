/**
 * Image Viewer — Simple Example
 *
 * A phased image review tool for ArchivDemo GmbH.
 * Left sidebar lists folders/phases. Main area shows stats cards
 * and the original + phase restoration images for the selected folder.
 *
 * Demonstrates:
 *   ui.shell()        — header + sidebar + main layout
 *   ui.grid()         — two-column stats + apply panel
 *   ui.table()        — folder list with status badges
 *   ui.metric()       — per-phase progress stats
 *   ui.filmStrip()    — before/after image sets
 *   ui.toggle()       — hide completed toggle
 *   handle.update()   — live row/metric updates
 */

import { app } from 'lastriko'

// ── Types ──────────────────────────────────────────────────────────────────

interface Folder {
  id:     string
  name:   string
  images: number
  phase1: number
  phase2: number
  phase3: number
}

interface ImageSet {
  filename: string
  original: string    // URL
  phase1:   string[]  // Restoration image URLs
  phase2:   string[]
  phase3:   string[]
}

// ── Mock data ──────────────────────────────────────────────────────────────

const FOLDERS: Folder[] = [
  { id: 'f01', name: 'Gartenweg 4 Grundrisse',          images: 2,  phase1: 1, phase2: 0, phase3: 0 },
  { id: 'f02', name: 'Rosenstraße 12-14 1G...',         images: 1,  phase1: 1, phase2: 0, phase3: 0 },
  { id: 'f03', name: 'Lindenallee 7, 9, 11...',         images: 13, phase1: 0, phase2: 0, phase3: 0 },
  { id: 'f04', name: 'Kastanienweg 3, Kel...',          images: 4,  phase1: 0, phase2: 0, phase3: 0 },
  { id: 'f05', name: 'Birkenstraße 22, 24...',          images: 3,  phase1: 0, phase2: 0, phase3: 0 },
  { id: 'f06', name: 'Fichtenweg 8 Grundrisse',         images: 3,  phase1: 0, phase2: 0, phase3: 0 },
  { id: 'f07', name: 'Ahornstraße 25-29, Ma...',        images: 5,  phase1: 0, phase2: 0, phase3: 0 },
  { id: 'f08', name: 'Eichenweg 1-7 10...',             images: 10, phase1: 0, phase2: 0, phase3: 0 },
  { id: 'f09', name: 'Tannenstraße 9-11 5...',          images: 5,  phase1: 0, phase2: 0, phase3: 0 },
  { id: 'f10', name: 'Buchenallee 4 Gru...',            images: 6,  phase1: 0, phase2: 0, phase3: 0 },
]

const IMAGES: ImageSet[] = [
  {
    filename: 'DG.jpg',
    original: 'https://example.com/originals/dg.jpg',
    phase1:   ['https://example.com/p1/dg_r1.jpg', 'https://example.com/p1/dg_r2.jpg'],
    phase2:   [],
    phase3:   [],
  },
  {
    filename: 'EG OG.jpg',
    original: 'https://example.com/originals/eg.jpg',
    phase1:   ['https://example.com/p1/eg_r1.jpg'],
    phase2:   [],
    phase3:   [],
  },
]

// ── App ───────────────────────────────────────────────────────────────────

app('ArchivDemo Image Viewer', { theme: 'dark' }, (ui) => {
  let selectedFolderId = FOLDERS[0].id

  // Hoist mutable handles — declared inside shell callbacks but needed
  // in loadFolder which is also defined inside the shell
  let folderTitle:  ReturnType<typeof ui.text>
  let phaseStats:   ReturnType<typeof ui.metric>[]  = []
  let loadFolder:   (id: string) => void             = () => {}

  ui.shell({
    header: (h) => {
      h.text('**ArchivDemo Image Viewer**')
      h.button('Phase Legend', () => {
        ui.toast(
          'Phase 1: Restoration  |  Phase 2: Vectorisation  |  Phase 3: QA',
          { type: 'info', duration: 6000 }
        )
      }, { variant: 'ghost' })
    },

    sidebar: (s) => {
      s.text('**FOLDERS**')
      s.toggle('Hide fully completed', { default: false })

      s.spacer('sm')
      s.text('STILL NEED')
      s.toggle('Phase 1', { default: true })
      s.toggle('Phase 2', { default: true })
      s.toggle('Phase 3', { default: true })

      s.divider()

      s.text('**ARCHIVDEMO GMBH**')
      const folderTable = s.table(
        FOLDERS.map((f) => ({
          _id:  f.id,
          name: f.name,
          imgs: f.images,
          p1:   f.phase1,
          p2:   f.phase2,
          p3:   f.phase3,
        })),
        { columns: ['name', 'imgs', 'p1', 'p2', 'p3'], striped: false }
      )

      folderTable.onRowClick((row) => {
        selectedFolderId = row._id as string
        loadFolder(selectedFolderId)
      })
    },

    main: (m) => {
      const initialFolder = FOLDERS[0]

      // ── Folder title ──────────────────────────────────────────────
      folderTitle = m.text(`**${initialFolder.name}** — ${initialFolder.images} images`)

      // ── Stats + Apply row ─────────────────────────────────────────
      m.grid([
        (left) => {
          left.card('Stats', (c) => {
            c.text('One block per original; multiple approvals count once per phase.')
            c.spacer('sm')
            phaseStats = [
              c.metric('Phase 1', '0%', { unit: `0 / ${initialFolder.images}` }),
              c.metric('Phase 2', '0%', { unit: `0 / ${initialFolder.images}` }),
              c.metric('Phase 3', '0%', { unit: `0 / ${initialFolder.images}` }),
            ]
          })
        },
        (right) => {
          right.card('Apply', (c) => {
            c.toggle('Phase 1', { default: true })
            c.toggle('Phase 2', { default: true })
            c.toggle('Phase 3', { default: true })
          })
        },
      ], { cols: ['1fr', '200px'], gap: 16 })

      m.divider()

      // ── Image sets ────────────────────────────────────────────────
      IMAGES.forEach((img) => {
        m.card((c) => {
          c.text(`**${img.filename}**`)
          c.grid([
            (orig) => {
              orig.text('ORIGINAL')
              orig.image(img.original, { alt: img.filename })
            },
            (rest) => {
              rest.text('PHASE 1 — RESTORATION')
              rest.filmStrip(img.phase1, { height: 100, zoom: true })
            },
          ], { cols: ['200px', '1fr'], gap: 8 })
        })
      })

      // ── Load folder ───────────────────────────────────────────────
      loadFolder = (folderId: string) => {
        const folder = FOLDERS.find((f) => f.id === folderId)!
        folderTitle.update(`**${folder.name}** — ${folder.images} images`)
        const pct = (n: number) => `${Math.round((n / folder.images) * 100)}%`
        phaseStats[0].update(pct(folder.phase1), { unit: `${folder.phase1} / ${folder.images}` })
        phaseStats[1].update(pct(folder.phase2), { unit: `${folder.phase2} / ${folder.images}` })
        phaseStats[2].update(pct(folder.phase3), { unit: `${folder.phase3} / ${folder.images}` })
      }
    },

  }, { sidebarPosition: 'left', sidebarWidth: '280px' })
})
