<script setup lang="ts">
import { computed } from 'vue'
import {
  assertPieLayout,
  PIE_CONTENT_LIMITS,
  preferList,
} from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

export type PieItem = {
  label?: string
  value?: string | number
}

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  chartTitle?: string
  items?: PieItem[]
  pie?: PieItem[]
}>()

assertPieLayout(props)

type Slice = {
  label: string
  value: number
  pct: number
  /** 1-based CSS var index --pk-slice-N from palette */
  colorVar: string
  path: string
  labelX: number
  labelY: number
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, r, endDeg)
  const end = polar(cx, cy, r, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`
}

const slices = computed((): Slice[] => {
  const raw = preferList(props.items, props.pie)
    .map((it) => ({
      label: String(it.label ?? "").trim().slice(0, PIE_CONTENT_LIMITS.maxLabelChars),
      value: Number(it.value),
    }))
    .filter((it) => it.label && Number.isFinite(it.value) && it.value > 0)
    .slice(0, PIE_CONTENT_LIMITS.maxSlices)
  const total = raw.reduce((s, it) => s + it.value, 0) || 1
  const cx = 120
  const cy = 120
  const r = 100
  let angle = 0
  return raw.map((it, i) => {
    const pct = Math.round((it.value / total) * 100)
    const sweep = (it.value / total) * 360
    const start = angle
    const end = angle + sweep
    const mid = start + sweep / 2
    const labelPos = polar(cx, cy, r * 0.58, mid)
    angle = end
    return {
      label: it.label,
      value: it.value,
      pct,
      colorVar: `var(--pk-slice-${(i % 5) + 1})`,
      path: arcPath(cx, cy, r, start, end),
      labelX: labelPos.x,
      labelY: labelPos.y,
    }
  })
})

const chartTitle = computed(() =>
  String(props.chartTitle ?? "")
    .trim()
    .slice(0, PIE_CONTENT_LIMITS.maxChartTitleChars),
)

const paletteClass = resolvePaletteClass(props.palette)
</script>

<template>
  <div class="pk-brick pk-pie" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-left">
        <div class="pk-kicker" v-if="kicker">
          <span class="pk-kicker__line" />
          <span class="pk-kicker__text">{{ kicker }}</span>
        </div>
        <div class="pk-title">
          <slot />
        </div>
      </div>
      <div class="pk-right">
        <div class="pk-chart-card">
          <div class="pk-chart-title" v-if="chartTitle">{{ chartTitle }}</div>
          <svg
            class="pk-chart-svg"
            viewBox="0 0 240 240"
            width="240"
            height="240"
            aria-hidden="true"
          >
            <path
              v-for="(s, i) in slices"
              :key="'p' + i"
              :d="s.path"
              :fill="s.colorVar"
              stroke="var(--pk-paper)"
              stroke-width="3"
            />
            <text
              v-for="(s, i) in slices"
              :key="'t' + i"
              :x="s.labelX"
              :y="s.labelY"
              class="pk-slice-pct"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ s.pct }}%
            </text>
          </svg>
          <div class="pk-legend">
            <div v-for="(s, i) in slices" :key="'l' + i" class="pk-legend__item">
              <span class="pk-legend__swatch" :style="{ background: s.colorVar }" />
              <span class="pk-legend__label">{{ s.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pk-brick {
  --pk-paper: #ffffff;
  --pk-ink: #161616;
  --pk-sub: #5c5c5c;
  --pk-accent: #e10600;
  --pk-faint: #9a9a9a;
  --pk-card: #ffffff;
  --pk-card-border: rgba(0, 0, 0, 0.08);
  /* Slice ramp — overridden per palette from theme accent family */
  --pk-slice-1: #f0a090;
  --pk-slice-2: #e10600;
  --pk-slice-3: #a01030;
  --pk-slice-4: #5c1028;
  --pk-slice-5: #2a1018;
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--pk-paper);
  color: var(--pk-ink);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.pk-brick__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(225, 6, 0, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(225, 6, 0, 0.05) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
  opacity: 0.35;
}
.pk-brick__inner {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 56px 64px 48px;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 48px;
  align-items: center;
  box-sizing: border-box;
}
.pk-left {
  min-width: 0;
  max-width: 28ch;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.pk-kicker__line {
  width: 28px;
  height: 3px;
  background: var(--pk-accent);
  border-radius: 2px;
  flex: none;
}
.pk-kicker__text {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--pk-accent);
}
.pk-title :deep(h1) {
  margin: 0 0 18px;
  font-size: 44px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.035em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.pk-title :deep(p) {
  margin: 0;
  font-size: 18px;
  line-height: 1.45;
  color: var(--pk-sub);
  font-weight: 500;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.pk-title :deep(ul),
.pk-title :deep(ol) {
  display: none;
}
.pk-right {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}
.pk-chart-card {
  width: 100%;
  max-width: 440px;
  background: var(--pk-card);
  border: 1px solid var(--pk-card-border);
  border-radius: 20px;
  padding: 28px 28px 24px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.pk-chart-title {
  width: 100%;
  text-align: left;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: var(--pk-ink);
}
.pk-chart-svg {
  flex: none;
}
.pk-slice-pct {
  fill: var(--pk-paper);
  font-size: 15px;
  font-weight: 800;
  font-family: ui-sans-serif, system-ui, sans-serif;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.25);
  stroke-width: 2px;
}
.pk-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 16px;
  width: 100%;
}
.pk-legend__item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pk-legend__swatch {
  width: 18px;
  height: 12px;
  border-radius: 4px;
  flex: none;
}
.pk-legend__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--pk-ink);
}
.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-card: #fffdf9;
  --pk-card-border: rgba(0, 0, 0, 0.08);
  --pk-slice-1: #e8b48a;
  --pk-slice-2: #c45c26;
  --pk-slice-3: #8b3a18;
  --pk-slice-4: #5c2e22;
  --pk-slice-5: #3d2418;
}
.pk-palette-ink,
.pk-palette-auto {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-card: #25282d;
  --pk-card-border: rgba(255, 255, 255, 0.1);
  --pk-slice-1: #e87890;
  --pk-slice-2: #c8102e;
  --pk-slice-3: #8b1030;
  --pk-slice-4: #5c1838;
  --pk-slice-5: #3a2848;
}
.pk-palette-ocean {
  --pk-paper: #e8eef2;
  --pk-ink: #1a2b3c;
  --pk-sub: #3d5266;
  --pk-accent: #2d6a8f;
  --pk-faint: #6b7f8f;
  --pk-card: #ffffff;
  --pk-card-border: rgba(26, 43, 60, 0.1);
  --pk-slice-1: #7eb8d4;
  --pk-slice-2: #2d6a8f;
  --pk-slice-3: #1a4a6a;
  --pk-slice-4: #163a52;
  --pk-slice-5: #0f2838;
}
.pk-palette-forest {
  --pk-paper: #eef2eb;
  --pk-ink: #1c2a1f;
  --pk-sub: #3d4d42;
  --pk-accent: #3d6b4f;
  --pk-faint: #6b7a70;
  --pk-card: #ffffff;
  --pk-slice-1: #8fbc9a;
  --pk-slice-2: #3d6b4f;
  --pk-slice-3: #2a4a38;
  --pk-slice-4: #1e3828;
  --pk-slice-5: #142820;
}
.pk-palette-slate {
  --pk-paper: #1e2228;
  --pk-ink: #f0f2f5;
  --pk-sub: #c5c9d0;
  --pk-accent: #6b9bd1;
  --pk-faint: #8a9099;
  --pk-card: #2a3038;
  --pk-card-border: rgba(255, 255, 255, 0.1);
  --pk-slice-1: #9bb8d9;
  --pk-slice-2: #6b9bd1;
  --pk-slice-3: #4a7ab0;
  --pk-slice-4: #355a80;
  --pk-slice-5: #243e58;
}
.pk-palette-amber {
  --pk-paper: #1a1814;
  --pk-ink: #f5f0e6;
  --pk-sub: #d4cbb8;
  --pk-accent: #c9a227;
  --pk-faint: #9a9180;
  --pk-card: #2a2620;
  --pk-slice-1: #e0c86a;
  --pk-slice-2: #c9a227;
  --pk-slice-3: #9a7818;
  --pk-slice-4: #6b5410;
  --pk-slice-5: #3d3010;
}
.pk-palette-wine {
  --pk-paper: #1f1418;
  --pk-ink: #f6ecef;
  --pk-sub: #d4c0c6;
  --pk-accent: #8b3a4a;
  --pk-faint: #9a8088;
  --pk-card: #2e2228;
  --pk-slice-1: #c87888;
  --pk-slice-2: #8b3a4a;
  --pk-slice-3: #6b2838;
  --pk-slice-4: #4a1828;
  --pk-slice-5: #2e1018;
}
.pk-palette-neon {
  --pk-paper: #0a0a12;
  --pk-ink: #f5f7ff;
  --pk-sub: #b8c0d9;
  --pk-accent: #00f0ff;
  --pk-faint: #7a8299;
  --pk-card: #16162a;
  --pk-slice-1: #66f5ff;
  --pk-slice-2: #00f0ff;
  --pk-slice-3: #00a8c8;
  --pk-slice-4: #0070a0;
  --pk-slice-5: #004070;
}
.pk-palette-sunset {
  --pk-paper: #1a0a18;
  --pk-ink: #fff5f8;
  --pk-sub: #f0c0d4;
  --pk-accent: #ff6b35;
  --pk-faint: #c48aa0;
  --pk-card: #2a1224;
  --pk-slice-1: #ff9a6b;
  --pk-slice-2: #ff6b35;
  --pk-slice-3: #e04080;
  --pk-slice-4: #a02060;
  --pk-slice-5: #601030;
}
.pk-palette-candy {
  --pk-paper: #fff5fb;
  --pk-ink: #1a1020;
  --pk-sub: #5a4060;
  --pk-accent: #ff2d95;
  --pk-faint: #8a7080;
  --pk-card: #ffffff;
  --pk-slice-1: #ff8ec8;
  --pk-slice-2: #ff2d95;
  --pk-slice-3: #c02080;
  --pk-slice-4: #801860;
  --pk-slice-5: #401030;
}
.pk-palette-volt {
  --pk-paper: #111111;
  --pk-ink: #f5f5f5;
  --pk-sub: #c8c8c8;
  --pk-accent: #c8ff00;
  --pk-faint: #8a8a8a;
  --pk-card: #1c1c1c;
  --pk-slice-1: #e0ff66;
  --pk-slice-2: #c8ff00;
  --pk-slice-3: #88b000;
  --pk-slice-4: #507000;
  --pk-slice-5: #304000;
}
</style>
