// Génère les animations Lottie de la charte graphique IDN à partir des tracés
// SVG du logo (packages/ui/src/components/idn-mark.tsx).
// Usage : bun run lottie:brand (depuis apps/web)
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import svgpath from "svgpath"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
// Kit de marque téléchargeable, servi tel quel par Next.
const PUBLIC_KIT = join(ROOT, "public/identite-graphique")
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../app/(public)/identite-graphique/_lottie"
)

const COLORS = {
  green: "#0e7c3a",
  greenSoft: "#e6f2ea",
  yellow: "#f2c811",
  blue: "#2563ac",
  white: "#ffffff",
  mutedSoft: "#a6a89d",
  yellowSoft: "#fcf4d6",
  ink: "#16170f",
}

// Tracés de l'empreinte (lucide « fingerprint », viewBox 24), ordonnés du
// centre vers l'extérieur pour que l'identité « se forme ».
const FINGERPRINT = [
  "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4",
  "M14 13.12c0 2.38 0 6.38-1 8.88",
  "M9 6.8a6 6 0 0 1 9 5.2v2",
  "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2",
  "M17.29 21.02c.12-.6.43-2.3.5-3.02",
  "M8.65 22c.21-.66.45-1.32.57-2",
  "M2 12a10 10 0 0 1 18-6",
  "M21.8 16c.2-2 .131-5.354 0-6",
  "M2 16h.01",
]

const SHIELD =
  "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"

// ── Primitives Lottie (bodymovin 5.x) ─────────────────────────────────────

const rgba = (hex) => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
  1,
]
const fixed = (k) => ({ a: 0, k })

// Courbes cubic-bezier : [[x1, y1], [x2, y2]].
const EASE = {
  inOut: [
    [0.65, 0],
    [0.35, 1],
  ],
  out: [
    [0.16, 1],
    [0.3, 1],
  ],
  back: [
    [0.34, 1.56],
    [0.64, 1],
  ],
  linear: [
    [0, 0],
    [1, 1],
  ],
}

/** keys : [frame, valeur, easing du segment suivant] */
function anim(rawKeys, { spatial = false } = {}) {
  // Deux images clés sur la même frame cassent l'interpolation (cas d'un délai nul) :
  // on garde la dernière.
  const keys = rawKeys.filter(([t], i) => rawKeys[i + 1]?.[0] !== t)
  return {
    a: 1,
    k: keys.map(([t, value, ease = "inOut"], index) => {
      const s = Array.isArray(value) ? value : [value]
      const key = { t, s }
      if (index < keys.length - 1) {
        const [[ox, oy], [ix, iy]] = EASE[ease]
        key.o = { x: s.map(() => ox), y: s.map(() => oy) }
        key.i = { x: s.map(() => ix), y: s.map(() => iy) }
        if (spatial) {
          key.to = [0, 0, 0]
          key.ti = [0, 0, 0]
        }
      }
      return key
    }),
  }
}

const transform = ({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) => ({
  ty: "tr",
  p: p.a === undefined ? fixed(p) : p,
  a: fixed(a),
  s: s.a === undefined ? fixed(s) : s,
  r: typeof r === "number" ? fixed(r) : r,
  o: typeof o === "number" ? fixed(o) : o,
  sk: fixed(0),
  sa: fixed(0),
})

const group = (nm, items, tr) => ({ ty: "gr", nm, it: [...items, transform(tr)] })
const stroke = (hex, w, o = 100) => ({
  ty: "st",
  c: fixed(rgba(hex)),
  o: typeof o === "number" ? fixed(o) : o,
  w: typeof w === "number" ? fixed(w) : w,
  lc: 2,
  lj: 2,
  ml: 4,
  bm: 0,
})
const fill = (hex, o = 100) => ({
  ty: "fl",
  c: fixed(rgba(hex)),
  o: typeof o === "number" ? fixed(o) : o,
  r: 1,
  bm: 0,
})
const trim = ({ s = fixed(0), e = fixed(100) }) => ({ ty: "tm", s, e, o: fixed(0), m: 1 })
const rect = (w, h, r, p) => ({
  ty: "rc",
  d: 1,
  s: w.a === undefined ? fixed([w, h]) : w,
  p: fixed(p),
  r: fixed(r),
})
const ellipse = (size, p) => ({
  ty: "el",
  d: 1,
  s: Array.isArray(size) ? fixed(size) : size,
  p: fixed(p),
})

/** Convertit un tracé SVG en formes Lottie (une par sous-tracé). */
function pathShapes(d, scale = 1, dx = 0, dy = 0) {
  const subpaths = []
  let current = null
  let last = [0, 0]
  const point = (x, y) => [x * scale + dx, y * scale + dy]
  const push = (v, inTangent = [0, 0]) => {
    current.v.push(v)
    current.i.push(inTangent)
    current.o.push([0, 0])
    last = v
  }
  svgpath(d)
    .abs()
    .unarc()
    .unshort()
    .iterate((segment, _index, x, y) => {
      const [cmd, ...args] = segment
      if (cmd === "M") {
        current = { v: [], i: [], o: [], c: false }
        subpaths.push(current)
        push(point(args[0], args[1]))
      } else if (cmd === "L") push(point(args[0], args[1]))
      else if (cmd === "H") push(point(args[0], y))
      else if (cmd === "V") push(point(x, args[0]))
      else if (cmd === "C") {
        const c1 = point(args[0], args[1])
        const c2 = point(args[2], args[3])
        const end = point(args[4], args[5])
        current.o[current.o.length - 1] = [c1[0] - last[0], c1[1] - last[1]]
        push(end, [c2[0] - end[0], c2[1] - end[1]])
      } else if (cmd === "Z") {
        current.c = true
        const first = current.v[0]
        if (Math.hypot(last[0] - first[0], last[1] - first[1]) < 1e-6) {
          current.i[0] = current.i.pop()
          current.v.pop()
          current.o.pop()
        }
      } else throw new Error(`Commande SVG non gérée : ${cmd}`)
    })
  return subpaths.map((ks) => ({ ty: "sh", ks: fixed(ks) }))
}

function layer(ind, nm, shapes, { size, op, ks = {} }) {
  const center = [size[0] / 2, size[1] / 2, 0]
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm,
    sr: 1,
    ks: {
      o: ks.o ?? fixed(100),
      r: ks.r ?? fixed(0),
      // Ancre (pivot) au centre par défaut ; sans position explicite, le calque reste en place.
      p: ks.p ?? fixed(ks.a ?? center),
      a: fixed(ks.a ?? center),
      s: ks.s ?? fixed([100, 100, 100]),
    },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  }
}

function composition(nm, [w, h], op, layers) {
  // Lottie dessine le premier calque au-dessus : on les déclare de bas en haut.
  return {
    v: "5.7.4",
    fr: 60,
    ip: 0,
    op,
    w,
    h,
    nm,
    ddd: 0,
    assets: [],
    layers: layers
      .reverse()
      .map((build, index) => build(index + 1, { size: [w, h], op })),
  }
}

// ── Animations ────────────────────────────────────────────────────────────

/** Le sceau apparaît, l'empreinte se trace du centre vers l'extérieur. */
function logoReveal() {
  const size = 512
  const c = size / 2
  return composition("IDN — révélation du logo", [size, size], 150, [
    // Onde de validation discrète une fois l'empreinte tracée.
    (ind, o) =>
      layer(
        ind,
        "onde",
        [
          group("onde", [
            rect(
              anim([
                [86, [448, 448], "out"],
                [132, [540, 540]],
              ]),
              0,
              128,
              [c, c]
            ),
            stroke(
              COLORS.green,
              6,
              anim([
                [0, 0, "linear"],
                [86, 0, "linear"],
                [88, 55, "out"],
                [132, 0],
              ])
            ),
          ]),
        ],
        o
      ),
    (ind, o) =>
      layer(ind, "sceau", [group("sceau", [rect(448, 448, 112, [c, c]), fill(COLORS.green)])], {
        ...o,
        ks: {
          s: anim([
            [0, [60, 60, 100], "back"],
            [26, [100, 100, 100]],
          ]),
          o: anim([
            [0, 0, "out"],
            [12, 100],
          ]),
        },
      }),
    (ind, o) =>
      layer(
        ind,
        "empreinte",
        FINGERPRINT.map((d, i) => {
          const start = 18 + i * 6
          return group(`trait ${i + 1}`, [
            ...pathShapes(d, 16, 64, 64),
            trim({
              e: anim([
                [0, 0, "linear"],
                [start, 0, "out"],
                [start + 34, 100],
              ]),
            }),
            stroke(COLORS.white, 28.8),
          ])
        }),
        o
      ),
  ])
}

/** Les trois barres du drapeau en vague : attente, chargement. */
function loader() {
  const [w, h] = [200, 80]
  const colors = [COLORS.green, COLORS.yellow, COLORS.blue]
  return composition("IDN — chargement", [w, h], 60, [
    ...colors.map((color, k) => (ind, o) => {
      const x = 40 + k * 60
      const d = k * 10
      return layer(ind, `barre ${k + 1}`, [group("barre", [rect(52, 12, 6, [w / 2, h / 2]), fill(color)])], {
        ...o,
        ks: {
          p: anim(
            [
              [0, [x, 46, 0], "linear"],
              [d, [x, 46, 0]],
              [d + 15, [x, 30, 0]],
              [d + 30, [x, 46, 0]],
            ],
            { spatial: true }
          ),
          o: anim([
            [0, 40, "linear"],
            [d, 40],
            [d + 15, 100],
            [d + 30, 40],
          ]),
        },
      })
    }),
  ])
}

/** Validation : disque vert, coche tracée, onde. */
function success() {
  const size = 240
  const c = size / 2
  return composition("IDN — succès", [size, size], 72, [
    (ind, o) =>
      layer(
        ind,
        "onde",
        [
          group("onde", [
            ellipse(
              anim([
                [10, [150, 150], "out"],
                [44, [228, 228]],
              ]),
              [c, c]
            ),
            stroke(
              COLORS.green,
              4,
              anim([
                [0, 0, "linear"],
                [10, 70, "out"],
                [44, 0],
              ])
            ),
          ]),
        ],
        o
      ),
    (ind, o) =>
      layer(ind, "disque", [group("disque", [ellipse([150, 150], [c, c]), fill(COLORS.green)])], {
        ...o,
        ks: {
          s: anim([
            [0, [0, 0, 100], "back"],
            [22, [100, 100, 100]],
          ]),
        },
      }),
    (ind, o) =>
      layer(
        ind,
        "coche",
        [
          group("coche", [
            ...pathShapes("M88 122L110 144L154 98"),
            trim({
              e: anim([
                [0, 0, "linear"],
                [16, 0, "out"],
                [40, 100],
              ]),
            }),
            stroke(COLORS.white, 14),
          ]),
        ],
        o
      ),
  ])
}

/** Capture KYC : viseur, ovale du visage, ligne de balayage. */
function scan() {
  const size = 240
  const c = size / 2
  const corners = [
    "M30 64V44a14 14 0 0 1 14-14h20",
    "M176 30h20a14 14 0 0 1 14 14v20",
    "M210 176v20a14 14 0 0 1-14 14h-20",
    "M64 210H44a14 14 0 0 1-14-14v-20",
  ]
  const lineY = (y) => [c, y, 0]
  return composition("IDN — capture d'identité", [size, size], 120, [
    (ind, o) =>
      layer(
        ind,
        "visage",
        [group("visage", [ellipse([104, 134], [c, c - 4]), stroke(COLORS.mutedSoft, 3, 70)])],
        o
      ),
    (ind, o) =>
      layer(
        ind,
        "viseur",
        [group("viseur", [...corners.flatMap((d) => pathShapes(d)), stroke(COLORS.green, 7)])],
        {
          ...o,
          ks: {
            s: anim([
              [0, [100, 100, 100]],
              [60, [95, 95, 100]],
              [120, [100, 100, 100]],
            ]),
          },
        }
      ),
    (ind, o) =>
      layer(
        ind,
        "balayage",
        [
          group("ligne", [rect(160, 3, 2, [c, c]), fill(COLORS.green)]),
          group("halo", [rect(160, 26, 4, [c, c - 14]), fill(COLORS.green, 14)]),
        ],
        {
          ...o,
          ks: {
            p: anim(
              [
                [0, lineY(52)],
                [60, lineY(188)],
                [120, lineY(52)],
              ],
              { spatial: true }
            ),
          },
        }
      ),
  ])
}

/** Identité vérifiée : bouclier tracé puis coche. */
function shield() {
  const size = 240
  return composition("IDN — identité vérifiée", [size, size], 96, [
    (ind, o) =>
      layer(
        ind,
        "bouclier",
        [
          group("coche", [
            ...pathShapes("M9 12l2 2l4-4", 8, 24, 24),
            trim({
              e: anim([
                [0, 0, "linear"],
                [38, 0, "out"],
                [58, 100],
              ]),
            }),
            stroke(COLORS.green, 13),
          ]),
          group("contour", [
            ...pathShapes(SHIELD, 8, 24, 24),
            trim({
              e: anim([
                [0, 0, "out"],
                [36, 100],
              ]),
            }),
            stroke(COLORS.green, 12),
          ]),
          group("fond", [
            ...pathShapes(SHIELD, 8, 24, 24),
            fill(
              COLORS.greenSoft,
              anim([
                [0, 0, "linear"],
                [28, 0, "out"],
                [44, 100],
              ])
            ),
          ]),
        ],
        {
          ...o,
          ks: {
            s: anim([
              [0, [100, 100, 100], "linear"],
              [58, [100, 100, 100], "out"],
              [66, [106, 106, 100]],
              [78, [100, 100, 100]],
            ]),
          },
        }
      ),
  ])
}

/** Authentification biométrique : l'empreinte se lit puis s'efface, en boucle. */
function biometric() {
  const size = 240
  const fingerprint = FINGERPRINT.flatMap((d) => pathShapes(d, 8, 24, 24))
  return composition("IDN — authentification biométrique", [size, size], 120, [
    (ind, o) =>
      layer(ind, "repère", [group("repère", [...fingerprint, stroke(COLORS.mutedSoft, 13, 45)])], o),
    (ind, o) =>
      layer(
        ind,
        "lecture",
        FINGERPRINT.map((d, i) =>
          group(`trait ${i + 1}`, [
            ...pathShapes(d, 8, 24, 24),
            trim({
              s: anim([
                [0, 0, "linear"],
                [70 + i * 3, 0, "inOut"],
                [100 + i * 3, 100],
              ]),
              e: anim([
                [0, 0, "linear"],
                [i * 4, 0, "out"],
                [40 + i * 4, 100],
              ]),
            }),
            stroke(COLORS.green, 13),
          ])
        ),
        o
      ),
  ])
}

// ── Animations des services ───────────────────────────────────────────────

const BELL = [
  "M10.268 21a2 2 0 0 0 3.464 0",
  "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
]
const FOLDER =
  "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"

/** Pastille d'attention : petit disque jaune cerclé de blanc qui apparaît. */
const badge = (ind, o, { at, size = 32, from }) =>
  layer(ind, "pastille", [group("pastille", [ellipse([size, size], at), fill(COLORS.yellow), stroke(COLORS.white, 6)])], {
    ...o,
    ks: {
      a: [...at, 0],
      s: anim([
        [0, [0, 0, 100], "linear"],
        [from, [0, 0, 100], "back"],
        [from + 14, [100, 100, 100]],
      ]),
    },
  })

/** iBoîte : l'enveloppe se trace, un courrier en sort, une pastille signale la nouveauté. */
function iboite() {
  const size = 240
  return composition("IDN — iBoîte", [size, size], 100, [
    (ind, o) =>
      layer(
        ind,
        "courrier",
        [
          group("lignes", [
            ...pathShapes("M90 96H150"),
            ...pathShapes("M90 110H134"),
            stroke(COLORS.green, 7),
          ]),
          group("feuille", [rect(116, 84, 8, [120, 120]), fill(COLORS.greenSoft), stroke(COLORS.green, 6)]),
        ],
        {
          ...o,
          ks: {
            p: anim(
              [
                [0, [120, 146, 0], "linear"],
                [40, [120, 146, 0], "back"],
                [68, [120, 76, 0]],
              ],
              { spatial: true }
            ),
          },
        }
      ),
    (ind, o) =>
      layer(
        ind,
        "enveloppe",
        [
          group("rabat", [
            ...pathShapes("M46 80L120 132L194 80"),
            trim({ e: anim([[0, 0, "linear"], [18, 0, "out"], [44, 100]]) }),
            stroke(COLORS.green, 10),
          ]),
          group("corps", [
            rect(168, 124, 16, [120, 128]),
            trim({ e: anim([[0, 0, "out"], [34, 100]]) }),
            stroke(COLORS.green, 10),
          ]),
          group("fond", [rect(168, 124, 16, [120, 128]), fill(COLORS.white)]),
        ],
        o
      ),
    (ind, o) => badge(ind, o, { at: [198, 70], size: 34, from: 70 }),
  ])
}

/** iCarte : trois cartes se déploient en éventail. */
function icarte() {
  const size = 240
  const card = (nm, color, final, delay, extra = []) => (ind, o) =>
    layer(ind, nm, [...extra, group("carte", [rect(150, 96, 14, [120, 124]), fill(color)])], {
      ...o,
      ks: {
        a: [120, 172, 0],
        p: anim(
          [
            [0, [120, 172, 0], "linear"],
            [delay, [120, 172, 0], "back"],
            [delay + 30, [120 + final.dx, 172 + final.dy, 0]],
          ],
          { spatial: true }
        ),
        r: anim([
          [0, 0, "linear"],
          [delay, 0, "back"],
          [delay + 30, final.r],
        ]),
        o: anim([
          [0, 0, "out"],
          [10, 100],
        ]),
      },
    })
  return composition("IDN — iCarte", [size, size], 90, [
    card("carte bleue", COLORS.blue, { dx: -18, dy: -6, r: -14 }, 8),
    card("carte jaune", COLORS.yellow, { dx: 0, dy: -12, r: -2 }, 14),
    card("carte verte", COLORS.green, { dx: 18, dy: -4, r: 11 }, 20, [
      group("lignes", [...pathShapes("M66 140H122"), ...pathShapes("M66 154H100"), stroke(COLORS.white, 7)]),
      group("puce", [rect(28, 22, 5, [80, 108]), fill(COLORS.yellowSoft)]),
    ]),
  ])
}

/** iDocument : le dossier se trace, le cadenas se ferme. */
function idocument() {
  const size = 240
  return composition("IDN — iDocument", [size, size], 100, [
    (ind, o) =>
      layer(
        ind,
        "dossier",
        [
          group("contour", [
            ...pathShapes(FOLDER, 8, 24, 20),
            trim({ e: anim([[0, 0, "out"], [34, 100]]) }),
            stroke(COLORS.green, 11),
          ]),
          group("fond", [
            ...pathShapes(FOLDER, 8, 24, 20),
            fill(COLORS.greenSoft, anim([[0, 0, "linear"], [18, 0, "out"], [36, 100]])),
          ]),
        ],
        o
      ),
    (ind, o) =>
      layer(
        ind,
        "cadenas",
        [
          group(
            "anse",
            [...pathShapes("M102 140V126a18 18 0 0 1 36 0v14"), stroke(COLORS.green, 9)],
            {
              p: anim(
                [
                  [0, [0, -14], "linear"],
                  [56, [0, -14], "back"],
                  [68, [0, 0]],
                ],
                { spatial: true }
              ),
            }
          ),
          group("serrure", [...pathShapes("M120 150V158"), stroke(COLORS.white, 6)]),
          group("corps", [rect(60, 44, 10, [120, 156]), fill(COLORS.green)]),
        ],
        {
          ...o,
          ks: {
            a: [120, 150, 0],
            s: anim([
              [0, [0, 0, 100], "linear"],
              [34, [0, 0, 100], "back"],
              [50, [100, 100, 100]],
            ]),
          },
        }
      ),
  ])
}

/** Notification : la cloche oscille depuis son sommet, la pastille apparaît. */
function notification() {
  const size = 240
  return composition("IDN — notification", [size, size], 110, [
    (ind, o) =>
      layer(
        ind,
        "cloche",
        [
          group("contour", [...BELL.flatMap((d) => pathShapes(d, 8, 24, 24)), stroke(COLORS.green, 11)]),
          group("fond", [...pathShapes(BELL[1], 8, 24, 24), fill(COLORS.greenSoft)]),
        ],
        {
          ...o,
          ks: {
            a: [120, 40, 0],
            r: anim([
              [0, 0],
              [10, 16],
              [22, -12],
              [34, 8],
              [46, -4],
              [58, 0],
            ]),
          },
        }
      ),
    (ind, o) => badge(ind, o, { at: [164, 64], size: 40, from: 6 }),
  ])
}

/** Présentation sans contact : la carte émet, en boucle. */
function partage() {
  const size = 240
  const wave = (k) => (ind, o) => {
    const d = k * 18
    return layer(
      ind,
      `onde ${k + 1}`,
      [
        group("onde", [
          ellipse(
            anim([
              [0, [40, 40], "linear"],
              [d, [40, 40], "linear"],
              [d + 54, [170, 170]],
            ]),
            [118, 120]
          ),
          trim({ s: fixed(16), e: fixed(34) }),
          stroke(
            COLORS.green,
            9,
            anim([
              [0, 0, "linear"],
              [d, 0, "out"],
              [d + 10, 100, "linear"],
              [d + 54, 0],
            ])
          ),
        ]),
      ],
      o
    )
  }
  return composition("IDN — présentation sans contact", [size, size], 90, [
    wave(0),
    wave(1),
    wave(2),
    (ind, o) =>
      layer(
        ind,
        "téléphone",
        [
          group("code", [rect(30, 30, 4, [74, 126]), fill(COLORS.green)]),
          group("écouteur", [...pathShapes("M66 74H82"), stroke(COLORS.green, 6)]),
          group("boîtier", [rect(72, 120, 16, [74, 120]), fill(COLORS.white), stroke(COLORS.green, 9)]),
        ],
        o
      ),
  ])
}

/** iCV : la page se compose, un badge certifie les diplômes. */
function icv() {
  const size = 240
  const lines = [
    ["M112 66H160", COLORS.green, 8],
    ["M112 82H146", COLORS.mutedSoft, 6],
    ["M72 116H168", COLORS.mutedSoft, 6],
    ["M72 132H168", COLORS.mutedSoft, 6],
    ["M72 148H140", COLORS.mutedSoft, 6],
  ]
  return composition("IDN — iCV", [size, size], 100, [
    (ind, o) =>
      layer(
        ind,
        "page",
        [
          ...lines.map(([d, color, w], i) =>
            group(`ligne ${i + 1}`, [
              ...pathShapes(d),
              trim({ e: anim([[0, 0, "linear"], [30 + i * 6, 0, "out"], [48 + i * 6, 100]]) }),
              stroke(color, w),
            ])
          ),
          group(
            "portrait",
            [ellipse([36, 36], [86, 74]), fill(COLORS.greenSoft), stroke(COLORS.green, 6)],
            {
              p: [86, 74],
              a: [86, 74],
              s: anim([
                [0, [0, 0], "linear"],
                [20, [0, 0], "back"],
                [34, [100, 100]],
              ]),
            }
          ),
          group("feuille", [
            rect(140, 176, 12, [120, 116]),
            trim({ e: anim([[0, 0, "out"], [30, 100]]) }),
            stroke(COLORS.green, 9),
          ]),
          group("fond", [rect(140, 176, 12, [120, 116]), fill(COLORS.white)]),
        ],
        o
      ),
    (ind, o) =>
      layer(
        ind,
        "certification",
        [
          group("coche", [
            ...pathShapes("M168 186l8 8l14-14"),
            trim({ e: anim([[0, 0, "linear"], [74, 0, "out"], [88, 100]]) }),
            stroke(COLORS.white, 7),
          ]),
          group("disque", [ellipse([46, 46], [178, 186]), fill(COLORS.green), stroke(COLORS.white, 5)]),
        ],
        {
          ...o,
          ks: {
            a: [178, 186, 0],
            s: anim([
              [0, [0, 0, 100], "linear"],
              [64, [0, 0, 100], "back"],
              [78, [100, 100, 100]],
            ]),
          },
        }
      ),
  ])
}

// ── Kit de marque (SVG, jetons) ───────────────────────────────────────────

function markSvg({ square, strokeColor, size = 512 }) {
  const paths = FINGERPRINT.map((d) => `    <path d="${d}"/>`).join("\n")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" role="img" aria-label="Identité Numérique du Gabon">
  <rect x="2" y="2" width="28" height="28" rx="7" fill="${square}"/>
  <g transform="translate(4 4)" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
${paths}
  </g>
</svg>
`
}

function lockupSvg({ text, sub, square, strokeColor, firstBar }) {
  const paths = FINGERPRINT.map((d) => `      <path d="${d}"/>`).join("\n")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="96" viewBox="0 0 400 96" fill="none" role="img" aria-label="Identité Numérique — République Gabonaise">
  <g transform="translate(8 16) scale(2)">
    <rect x="2" y="2" width="28" height="28" rx="7" fill="${square}"/>
    <g transform="translate(4 4)" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
${paths}
    </g>
  </g>
  <text x="92" y="44" fill="${text}" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="26" font-weight="600" letter-spacing="-0.4">Identité Numérique</text>
  <text x="93" y="64" fill="${sub}" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="11" letter-spacing="1.2">RÉPUBLIQUE GABONAISE</text>
  <rect x="93" y="73" width="26" height="3" rx="1.5" fill="${firstBar}"/>
  <rect x="122" y="73" width="26" height="3" rx="1.5" fill="${COLORS.yellow}"/>
  <rect x="151" y="73" width="26" height="3" rx="1.5" fill="${COLORS.blue}"/>
</svg>
`
}

const TOKENS = {
  color: {
    green: "#0e7c3a",
    greenDark: "#0a5c2c",
    greenSoft: "#e6f2ea",
    yellow: "#f2c811",
    yellowSoft: "#fcf4d6",
    blue: "#2563ac",
    blueSoft: "#e6eef7",
    destructive: "#b3261e",
    light: { bg: "#fafaf8", surface: "#ffffff", surface2: "#f4f3ee", border: "#e6e4dd", ink: "#16170f", ink2: "#3a3d2e", muted: "#5e6058" },
    dark: { bg: "#0e110d", surface: "#181c16", surface2: "#22271f", border: "#2c3128", ink: "#f2f0e8", ink2: "#d4d2c7", muted: "#b0b2a4", greenText: "#5bc57f", blueText: "#6ba4e0" },
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 20, pill: 9999 },
  font: { sans: "IBM Plex Sans", mono: "IBM Plex Mono" },
  motion: {
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
    easeBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    durations: { hover: 150, screen: 250, panel: 400 },
  },
}

function tokensCss() {
  const { color, radius } = TOKENS
  const vars = (prefix, obj) =>
    Object.entries(obj)
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => `  --idn-${prefix}${k.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`)}: ${v};`)
      .join("\n")
  return `/* IDN — jetons de design (générés par apps/web/scripts/brand-lottie.mjs) */
:root {
${vars("", color)}
${vars("", color.light)}
${Object.entries(radius).map(([k, v]) => `  --idn-radius-${k}: ${v}px;`).join("\n")}
  --idn-font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --idn-font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --idn-ease-out: ${TOKENS.motion.easeOut};
}

.dark {
${vars("", color.dark)}
}
`
}

function writeKit(animations) {
  const files = {
    "logo/idn-symbole.svg": markSvg({ square: COLORS.green, strokeColor: COLORS.white }),
    "logo/idn-symbole-inverse.svg": markSvg({ square: COLORS.white, strokeColor: COLORS.green }),
    "logo/idn-symbole-monochrome.svg": markSvg({ square: COLORS.ink, strokeColor: COLORS.white }),
    "logo/idn-signature.svg": lockupSvg({ text: COLORS.ink, sub: "#5e6058", square: COLORS.green, strokeColor: COLORS.white, firstBar: COLORS.green }),
    "logo/idn-signature-inverse.svg": lockupSvg({ text: COLORS.white, sub: "#c9d3cc", square: COLORS.white, strokeColor: COLORS.green, firstBar: COLORS.white }),
    "jetons/idn-tokens.json": `${JSON.stringify(TOKENS, null, 2)}\n`,
    "jetons/idn-tokens.css": tokensCss(),
    ...Object.fromEntries(Object.entries(animations).map(([name, data]) => [`lottie/${name}.json`, JSON.stringify(data)])),
  }
  for (const [path, content] of Object.entries(files)) {
    const target = join(PUBLIC_KIT, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
  console.log(`✓ kit : ${Object.keys(files).length} fichiers dans public/identite-graphique`)
}

mkdirSync(OUT, { recursive: true })
const animations = {
  "logo-reveal": logoReveal(),
  loader: loader(),
  success: success(),
  scan: scan(),
  shield: shield(),
  biometric: biometric(),
  iboite: iboite(),
  icarte: icarte(),
  idocument: idocument(),
  notification: notification(),
  partage: partage(),
  icv: icv(),
}
for (const [name, data] of Object.entries(animations)) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data))
  console.log(`✓ ${name}.json`)
}
writeKit(animations)
