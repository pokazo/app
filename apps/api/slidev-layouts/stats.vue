<script setup lang="ts">
import { assertStatsLayout } from './layout-assert.js'

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
const items = (props.items ?? props.stats ?? []).slice(0, 4)

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"
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
}
</style>
