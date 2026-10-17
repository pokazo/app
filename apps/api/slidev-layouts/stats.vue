<script setup lang="ts">
import { assertStatsLayout } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

export type StatItem = {
  value?: string
  label?: string
  note?: string
}

const props = defineProps<{
  palette?: string

  kicker?: string
  source?: string
  items?: StatItem[]
  /** Alias — models often emit `stats:` instead of `items:` */
  stats?: StatItem[]
}>()

assertStatsLayout(props)
const items = (props.items?.length ? props.items : props.stats ?? []).slice(0, 4)

const paletteClass = resolvePaletteClass(props.palette)
</script>

<template>
  <div class="pk-brick pk-stats" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__frame" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-title">
        <slot />
      </div>
      <div class="pk-stats__grid">
        <div v-for="(it, i) in items" :key="i" class="pk-stats__card">
          <div class="pk-stats__value">{{ it.value }}</div>
          <div class="pk-stats__label">{{ it.label }}</div>
          <div class="pk-stats__note">{{ it.note }}</div>
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
  --pk-card: #f2f2f2;
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
    linear-gradient(to right, rgba(225,6,0,0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(225,6,0,0.07) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}
.pk-brick__frame {
  display: none;
}
.pk-brick__inner {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 52px 64px 44px;
  display: flex;
  flex-direction: column;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
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
  margin: 0 0 28px;
  font-size: 40px;
  line-height: 1.1;
  font-weight: 800;
}
.pk-title :deep(ul),
.pk-title :deep(p) {
  display: none;
}
.pk-stats__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  flex: 1;
  min-height: 0;
}
.pk-stats__card {
  background: var(--pk-card);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pk-stats__value {
  font-size: 52px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--pk-accent);
}
.pk-stats__label {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
}
.pk-stats__note {
  font-size: 14px;
  color: var(--pk-sub);
  line-height: 1.4;
}

.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
}
.pk-palette-ink,
.pk-palette-auto {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-card: #25282d;
}
.pk-palette-ocean {
  --pk-paper: #e8eef2;
  --pk-ink: #1a2b3c;
  --pk-sub: #3d5266;
  --pk-accent: #2d6a8f;
  --pk-faint: #6b7f8f;
  --pk-card: #dce6ee;
}
.pk-palette-forest {
  --pk-paper: #eef2eb;
  --pk-ink: #1c2a1f;
  --pk-sub: #3d4d42;
  --pk-accent: #3d6b4f;
  --pk-faint: #6b7a70;
  --pk-card: #e0e8dc;
}
.pk-palette-slate {
  --pk-paper: #1e2228;
  --pk-ink: #f0f2f5;
  --pk-sub: #c5c9d0;
  --pk-accent: #6b9bd1;
  --pk-faint: #8a9099;
  --pk-card: #2a3038;
}
.pk-palette-amber {
  --pk-paper: #1a1814;
  --pk-ink: #f5f0e6;
  --pk-sub: #d4cbb8;
  --pk-accent: #c9a227;
  --pk-faint: #9a9180;
  --pk-card: #2a2620;
}
.pk-palette-wine {
  --pk-paper: #1f1418;
  --pk-ink: #f6ecef;
  --pk-sub: #d4c0c6;
  --pk-accent: #8b3a4a;
  --pk-faint: #9a8088;
  --pk-card: #2e2228;
}
.pk-palette-neon {
  --pk-paper: #0a0a12;
  --pk-ink: #f5f7ff;
  --pk-sub: #b8c0d9;
  --pk-accent: #00f0ff;
  --pk-faint: #7a8299;
  --pk-card: #16162a;
}
.pk-palette-sunset {
  --pk-paper: #1a0a18;
  --pk-ink: #fff5f8;
  --pk-sub: #f0c0d4;
  --pk-accent: #ff6b35;
  --pk-faint: #c48aa0;
  --pk-card: #2a1224;
}
.pk-palette-candy {
  --pk-paper: #fff5fb;
  --pk-ink: #1a1020;
  --pk-sub: #5a4060;
  --pk-accent: #ff2d95;
  --pk-faint: #8a7080;
  --pk-card: #ffe8f5;
}
.pk-palette-volt {
  --pk-paper: #111111;
  --pk-ink: #f5f5f5;
  --pk-sub: #c8c8c8;
  --pk-accent: #c8ff00;
  --pk-faint: #8a8a8a;
  --pk-card: #1c1c1c;
}
</style>
