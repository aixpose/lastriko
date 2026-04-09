/**
 * Image Viewer — Simple Example
 *
 * A phased image review tool for ArchivDemo GmbH.
 * Left sidebar lists folders with filters. The main area uses one tab per
 * folder so originals and phase thumbnails stay correct when you pick a row.
 *
 * Demonstrates:
 *   ui.shell()        — header + sidebar + main layout
 *   ui.grid()         — stats + actions column
 *   ui.tabs()         — one panel per building / folder
 *   ui.table()        — folder list; row click syncs the active tab
 *   ui.metric()       — per-phase progress (static per tab from mock data)
 *   ui.image() / ui.imageGrid() — originals + restoration sets (SVG placeholders)
 *   ui.toggle()       — filter folders by completion / phase backlog
 *   TableHandle.update — replace visible rows when filters change
 *   TabsHandle.setActive — jump to a folder from the table
 */

import { app } from 'lastriko'
import type { TableHandle, TabsHandle, ToggleHandle } from 'lastriko'

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
  original: string
  phase1:   string[]
  phase2:   string[]
  phase3:   string[]
}

// ── Placeholder images (no network; reliable in demos and E2E) ───────────────

function svgDataUri(label: string, bg: string): string {
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160">` +
    `<rect fill="${bg}" width="100%" height="100%"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ` +
    `fill="#f5f5f5" font-size="13" font-family="system-ui,sans-serif">${safe}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
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

const IMAGES_BY_FOLDER: Record<string, ImageSet[]> = {
  f01: [
    {
      filename: 'DG.jpg',
      original: svgDataUri('Original · DG', '#1e3a5f'),
      phase1: [
        svgDataUri('P1 · DG A', '#2d6a4f'),
        svgDataUri('P1 · DG B', '#40916c'),
      ],
      phase2: [],
      phase3: [],
    },
    {
      filename: 'EG OG.jpg',
      original: svgDataUri('Original · EG', '#1e3a5f'),
      phase1: [svgDataUri('P1 · EG', '#52b788')],
      phase2: [],
      phase3: [],
    },
  ],
  f02: [
    {
      filename: 'Erdgeschoss.pdf',
      original: svgDataUri('Original · EG', '#4a148c'),
      phase1: [svgDataUri('P1 · EG', '#7b1fa2')],
      phase2: [],
      phase3: [],
    },
  ],
}

function defaultImagesForFolder(folder: Folder): ImageSet[] {
  const n = Math.min(2, Math.max(1, Math.ceil(folder.images / 6)))
  const sets: ImageSet[] = []
  for (let i = 0; i < n; i += 1) {
    const tag = `${folder.name.slice(0, 12).trim()}… #${i + 1}`
    sets.push({
      filename: `Scan ${i + 1}`,
      original: svgDataUri(`Orig · ${tag}`, '#37474f'),
      phase1: folder.phase1 > 0
        ? [svgDataUri(`P1 · ${tag}`, '#00695c')]
        : [],
      phase2: folder.phase2 > 0
        ? [svgDataUri(`P2 · ${tag}`, '#1565c0')]
        : [],
      phase3: folder.phase3 > 0
        ? [svgDataUri(`P3 · ${tag}`, '#6a1b9a')]
        : [],
    })
  }
  return sets
}

function imagesForFolder(folder: Folder): ImageSet[] {
  return IMAGES_BY_FOLDER[folder.id] ?? defaultImagesForFolder(folder)
}

function folderRow(f: Folder) {
  return {
    _id:  f.id,
    name: f.name,
    imgs: f.images,
    p1:   f.phase1,
    p2:   f.phase2,
    p3:   f.phase3,
  }
}

function isFullyCompleted(f: Folder): boolean {
  return f.phase1 >= f.images && f.phase2 >= f.images && f.phase3 >= f.images
}

function passesPhaseNeed(f: Folder, needP1: boolean, needP2: boolean, needP3: boolean): boolean {
  if (!needP1 && !needP2 && !needP3)
    return true
  if (needP1 && f.phase1 < f.images)
    return true
  if (needP2 && f.phase2 < f.images)
    return true
  if (needP3 && f.phase3 < f.images)
    return true
  return false
}

// ── App ───────────────────────────────────────────────────────────────────

await app(
  'ArchivDemo Image Viewer',
  (ui) => {
  let folderTable: TableHandle | undefined
  let folderTabs: TabsHandle | undefined
  let hideCompletedToggle: ToggleHandle | undefined
  let needPhaseToggles: ToggleHandle[] = []

  const refreshFolderTable = (): void => {
    if (!folderTable || !hideCompletedToggle)
      return
    const hideDone = hideCompletedToggle.value
    const needP1 = needPhaseToggles[0]?.value ?? true
    const needP2 = needPhaseToggles[1]?.value ?? true
    const needP3 = needPhaseToggles[2]?.value ?? true

    const visible = FOLDERS.filter((f) => {
      if (hideDone && isFullyCompleted(f))
        return false
      return passesPhaseNeed(f, needP1, needP2, needP3)
    })

    const rows = visible.map((f) => ({
      id: `folder-row-${f.id}`,
      data: folderRow(f),
    }))
    folderTable.update({ rows })

    if (visible.length === 0)
      return

    const activeName = folderTabs?.value
    const stillVisible = activeName && visible.some((f) => f.name === activeName)
    if (!stillVisible)
      folderTabs?.setActive(visible[0].name)
  }

  ui.shell({
    header: (h) => {
      h.text('**ArchivDemo Image Viewer**')
      h.button('Phase Legend', () => {
        ui.toast(
          'Phase 1: Restoration  |  Phase 2: Vectorisation  |  Phase 3: QA',
          { type: 'info', duration: 6000 },
        )
      }, { variant: 'ghost' })
    },

    sidebar: (s) => {
      s.text('**FOLDERS**')
      hideCompletedToggle = s.toggle('Hide fully completed', { default: false })

      s.spacer('sm')
      s.text('STILL NEED')
      needPhaseToggles = [
        s.toggle('Phase 1', { default: true }),
        s.toggle('Phase 2', { default: true }),
        s.toggle('Phase 3', { default: true }),
      ]

      s.button('Apply filters', () => {
        refreshFolderTable()
      })

      s.divider()

      s.text('**ARCHIVDEMO GMBH**')
      folderTable = s.table(
        FOLDERS.map((f) => folderRow(f)),
        { columns: ['name', 'imgs', 'p1', 'p2', 'p3'], striped: false },
      )

      folderTable.onRowClick((row) => {
        const name = String(row.name)
        folderTabs?.setActive(name)
      })

      refreshFolderTable()
    },

    main: (m) => {
      folderTabs = m.tabs(
        FOLDERS.map((folder) => ({
          label: folder.name,
          content: (t) => {
            t.text(`**${folder.name}** — ${folder.images} images`)

            const pct = (n: number) =>
              folder.images > 0 ? `${Math.round((n / folder.images) * 100)}%` : '0%'

            t.grid([
              (left) => {
                left.card('Stats', (c) => {
                  c.text('One block per original; multiple approvals count once per phase.')
                  c.spacer('sm')
                  c.metric('Phase 1', pct(folder.phase1), {
                    unit: `${folder.phase1} / ${folder.images}`,
                  })
                  c.metric('Phase 2', pct(folder.phase2), {
                    unit: `${folder.phase2} / ${folder.images}`,
                  })
                  c.metric('Phase 3', pct(folder.phase3), {
                    unit: `${folder.phase3} / ${folder.images}`,
                  })
                })
              },
              (right) => {
                right.card('Tips', (c) => {
                  c.text(
                    'Pick a row in the sidebar table to jump here. Use **Apply filters** after changing toggles so the table matches your backlog rules.',
                  )
                })
              },
            ], { cols: ['1fr', '220px'], gap: 16 })

            t.divider()

            const sets = imagesForFolder(folder)
            sets.forEach((img) => {
              t.card((c) => {
                c.text(`**${img.filename}**`)
                c.grid([
                  (orig) => {
                    orig.text('ORIGINAL')
                    orig.image(img.original, { alt: `${img.filename} original` })
                  },
                  (rest) => {
                    rest.text('PHASE 1 — RESTORATION')
                    if (img.phase1.length > 0) {
                      rest.imageGrid(
                        img.phase1.map((src, i) => ({
                          src,
                          alt: `${img.filename} restoration ${i + 1}`,
                        })),
                        { cols: 'auto', minWidth: 140, gap: 8 },
                      )
                    } else {
                      rest.text('_No Phase 1 candidates yet._')
                    }
                  },
                ], { cols: ['200px', '1fr'], gap: 8 })

                if (img.phase2.length > 0 || img.phase3.length > 0) {
                  c.spacer('sm')
                  c.grid([
                    (p2) => {
                      p2.text('PHASE 2 — VECTOR')
                      if (img.phase2.length > 0) {
                        p2.imageGrid(
                          img.phase2.map((src, i) => ({
                            src,
                            alt: `${img.filename} vector ${i + 1}`,
                          })),
                          { cols: 'auto', minWidth: 140, gap: 8 },
                        )
                      } else {
                        p2.text('_Pending._')
                      }
                    },
                    (p3) => {
                      p3.text('PHASE 3 — QA')
                      if (img.phase3.length > 0) {
                        p3.imageGrid(
                          img.phase3.map((src, i) => ({
                            src,
                            alt: `${img.filename} QA ${i + 1}`,
                          })),
                          { cols: 'auto', minWidth: 140, gap: 8 },
                        )
                      } else {
                        p3.text('_Pending._')
                      }
                    },
                  ], { cols: ['1fr', '1fr'], gap: 8 })
                }
              })
            })
          },
        })),
        { defaultTab: FOLDERS[0].name },
      )
    },

  }, { sidebarPosition: 'left', sidebarWidth: '280px' })
  },
  { server: { theme: 'dark' } },
)
