<script setup lang="ts">
import { assertIconLayout } from './layout-assert.js'

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  /** Outline hint, e.g. carbon-idea — shown as badge if no icon in body */
  iconHint?: string
}>()

assertIconLayout(props)
const badge = (props.iconHint ?? "").replace(/^(carbon|mdi)-/i, "").replace(/-/g, " ").trim()

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"
</script>

<template>
  <div class="pk-brick pk-icon" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-icon__row">
        <div class="pk-icon__badge" aria-hidden>
          <span class="pk-icon__glyph">{{ badge ? badge.slice(0, 1).toUpperCase() : "◆" }}</span>
          <span v-if="badge" class="pk-icon__hint">{{ badge }}</span>
        </div>
        <div class="pk-icon__body">
          <slot />
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
    linear-gradient(to right, rgba(225, 6, 0, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(225, 6, 0, 0.06) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}
.pk-brick__inner {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 48px 56px 40px;
  display: flex;
  flex-direction: column;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
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
.pk-icon__row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 40px;
  align-items: center;
  flex: 1;
  min-height: 0;
}
.pk-icon__badge {
  width: 160px;
  height: 160px;
  border-radius: 28px;
  background: var(--pk-card);
  border: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.05);
}
.pk-icon__glyph {
  font-size: 56px;
  font-weight: 800;
  color: var(--pk-accent);
  line-height: 1;
}
.pk-icon__hint {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pk-sub);
  text-align: center;
  padding: 0 10px;
}
.pk-icon__body {
  min-width: 0;
}
.pk-icon__body :deep(h1) {
  margin: 0 0 18px;
  font-size: 32px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.pk-icon__body :deep(ul) {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pk-icon__body :deep(li) {
  position: relative;
  padding-left: 1.15em;
  font-size: 18px;
  line-height: 1.4;
}
.pk-icon__body :deep(li)::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 0.45em;
  height: 0.45em;
  background: var(--pk-accent);
  border-radius: 1px;
}
.pk-icon__body :deep([class*="carbon"]),
.pk-icon__body :deep([class*="mdi"]) {
  display: none;
}
.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-card: #efe8dc;
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
</style>
