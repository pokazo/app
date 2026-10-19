<script setup lang="ts">
import { computed } from 'vue'
import {
  AGENDA_CONTENT_LIMITS,
  assertAgendaLayout,
  preferList,
} from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

export type AgendaItem = {
  title?: string
  body?: string
}

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  items?: AgendaItem[]
  cards?: AgendaItem[]
}>()

assertAgendaLayout(props)

const items = computed(() =>
  preferList(props.items, props.cards)
    .map((it) => String(it?.title ?? '').trim())
    .filter(Boolean)
    .slice(0, AGENDA_CONTENT_LIMITS.maxItems)
    .map((title) => title.slice(0, AGENDA_CONTENT_LIMITS.maxTitleChars)),
)

const paletteClass = resolvePaletteClass(props.palette)

/** Density class so 4–5 rows fit under H1+desc without clipping. */
const densityClass = computed(() => {
  const n = items.value.length
  if (n >= 5) return 'pk-agenda--n5'
  if (n >= 4) return 'pk-agenda--n4'
  return 'pk-agenda--n3'
})

function padIndex(i: number): string {
  return String(i + 1).padStart(2, '0')
}
</script>

<template>
  <div class="pk-brick pk-agenda" :class="[paletteClass, densityClass]">
    <svg
      class="pk-agenda__waves"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <!-- Top-right arcs -->
      <path
        d="M 720 0 C 980 180, 1280 220, 1920 160"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 820 0 C 1040 200, 1340 260, 1920 220"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 920 0 C 1100 220, 1400 300, 1920 280"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 1020 0 C 1160 240, 1460 340, 1920 340"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 1120 0 C 1220 260, 1520 380, 1920 400"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 1220 0 C 1300 280, 1580 420, 1920 460"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <!-- Bottom-left arcs -->
      <path
        d="M 0 620 C 280 700, 420 860, 480 1080"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 0 700 C 320 760, 500 900, 560 1080"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 0 780 C 360 820, 580 940, 640 1080"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 0 860 C 400 880, 660 980, 720 1080"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M 0 940 C 440 940, 740 1020, 800 1080"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
    </svg>
    <div class="pk-brick__inner">
      <div class="pk-agenda__head">
        <div class="pk-kicker" v-if="kicker">
          <span class="pk-kicker__line" />
          <span class="pk-kicker__text">{{ kicker }}</span>
        </div>
        <div class="pk-title">
          <slot />
        </div>
      </div>
      <ol class="pk-agenda__list">
        <li v-for="(title, i) in items" :key="i" class="pk-agenda__row">
          <span class="pk-agenda__badge" aria-hidden="true">{{ padIndex(i) }}</span>
          <span class="pk-agenda__label">{{ title }}</span>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.pk-brick {
  --pk-paper: #ffffff;
  --pk-ink: #161616;
  --pk-sub: #6b6b6b;
  --pk-accent: #c84666;
  --pk-faint: #9a9a9a;
  --pk-rule: rgba(0, 0, 0, 0.1);
  --pk-wave: rgba(0, 0, 0, 0.08);
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--pk-paper);
  color: var(--pk-ink);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.pk-agenda__waves {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--pk-wave);
  pointer-events: none;
  z-index: 0;
}
.pk-brick__inner {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 56px 80px 48px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-width: 1100px;
  gap: 28px;
}
.pk-agenda__head {
  flex: none;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex: none;
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
.pk-title {
  flex: none;
}
.pk-title :deep(h1) {
  margin: 0 0 12px;
  font-size: 48px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.035em;
  max-width: 18ch;
}
.pk-title :deep(p) {
  margin: 0;
  font-size: 18px;
  line-height: 1.4;
  color: var(--pk-sub);
  font-weight: 500;
  max-width: 42ch;
}
.pk-agenda__list {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 640px;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.pk-agenda__row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 0;
  border-bottom: 1px solid var(--pk-rule);
  flex: none;
}
.pk-agenda__row:first-child {
  border-top: 1px solid var(--pk-rule);
}
.pk-agenda__badge {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--pk-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
}
.pk-agenda__label {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--pk-ink);
}

/* Tighter rows when more items — keeps 5 inside 1080. */
.pk-agenda--n4 .pk-brick__inner {
  gap: 22px;
  padding-top: 48px;
  padding-bottom: 40px;
}
.pk-agenda--n4 .pk-title :deep(h1) {
  font-size: 44px;
}
.pk-agenda--n4 .pk-agenda__row {
  padding: 14px 0;
}
.pk-agenda--n4 .pk-agenda__label {
  font-size: 22px;
}

.pk-agenda--n5 .pk-brick__inner {
  gap: 18px;
  padding-top: 44px;
  padding-bottom: 36px;
}
.pk-agenda--n5 .pk-title :deep(h1) {
  font-size: 40px;
  margin-bottom: 10px;
}
.pk-agenda--n5 .pk-title :deep(p) {
  font-size: 17px;
}
.pk-agenda--n5 .pk-agenda__row {
  padding: 11px 0;
}
.pk-agenda--n5 .pk-agenda__badge {
  width: 36px;
  height: 36px;
  font-size: 13px;
}
.pk-agenda--n5 .pk-agenda__label {
  font-size: 20px;
}

.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-rule: rgba(0, 0, 0, 0.12);
  --pk-wave: rgba(196, 92, 38, 0.14);
}
.pk-palette-ink,
.pk-palette-auto {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-rule: rgba(255, 255, 255, 0.16);
  --pk-wave: rgba(255, 255, 255, 0.1);
}
.pk-palette-ocean {
  --pk-paper: #e8eef2;
  --pk-ink: #1a2b3c;
  --pk-sub: #3d5266;
  --pk-accent: #2d6a8f;
  --pk-faint: #6b7f8f;
  --pk-rule: rgba(26, 43, 60, 0.12);
  --pk-wave: rgba(45, 106, 143, 0.16);
}
.pk-palette-forest {
  --pk-paper: #eef2eb;
  --pk-ink: #1c2a1f;
  --pk-sub: #3d4d42;
  --pk-accent: #3d6b4f;
  --pk-faint: #6b7a70;
  --pk-rule: rgba(28, 42, 31, 0.12);
  --pk-wave: rgba(61, 107, 79, 0.16);
}
.pk-palette-slate {
  --pk-paper: #1e2228;
  --pk-ink: #f0f2f5;
  --pk-sub: #c5c9d0;
  --pk-accent: #6b9bd1;
  --pk-faint: #8a9099;
  --pk-rule: rgba(255, 255, 255, 0.14);
  --pk-wave: rgba(107, 155, 209, 0.18);
}
.pk-palette-amber {
  --pk-paper: #1a1814;
  --pk-ink: #f5f0e6;
  --pk-sub: #d4cbb8;
  --pk-accent: #c9a227;
  --pk-faint: #9a9180;
  --pk-rule: rgba(255, 255, 255, 0.14);
  --pk-wave: rgba(201, 162, 39, 0.18);
}
.pk-palette-wine {
  --pk-paper: #1f1418;
  --pk-ink: #f6ecef;
  --pk-sub: #d4c0c6;
  --pk-accent: #8b3a4a;
  --pk-faint: #9a8088;
  --pk-rule: rgba(255, 255, 255, 0.14);
  --pk-wave: rgba(139, 58, 74, 0.2);
}
.pk-palette-neon {
  --pk-paper: #0a0a12;
  --pk-ink: #f5f7ff;
  --pk-sub: #b8c0d9;
  --pk-accent: #00f0ff;
  --pk-faint: #7a8299;
  --pk-rule: rgba(255, 255, 255, 0.14);
  --pk-wave: rgba(0, 240, 255, 0.16);
}
.pk-palette-sunset {
  --pk-paper: #1a0a18;
  --pk-ink: #fff5f8;
  --pk-sub: #f0c0d4;
  --pk-accent: #ff6b35;
  --pk-faint: #c48aa0;
  --pk-rule: rgba(255, 255, 255, 0.14);
  --pk-wave: rgba(255, 107, 53, 0.18);
}
.pk-palette-candy {
  --pk-paper: #fff5fb;
  --pk-ink: #1a1020;
  --pk-sub: #5a4060;
  --pk-accent: #ff2d95;
  --pk-faint: #8a7080;
  --pk-rule: rgba(26, 16, 32, 0.12);
  --pk-wave: rgba(255, 45, 149, 0.14);
}
.pk-palette-volt {
  --pk-paper: #111111;
  --pk-ink: #f5f5f5;
  --pk-sub: #c8c8c8;
  --pk-accent: #c8ff00;
  --pk-faint: #8a8a8a;
  --pk-rule: rgba(255, 255, 255, 0.14);
  --pk-wave: rgba(200, 255, 0, 0.14);
}
</style>
