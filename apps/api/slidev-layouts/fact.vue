<script setup lang="ts">
import { useSlots } from 'vue'
import { assertFactLayout } from './layout-assert.js'

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
}>()

const slots = useSlots()
assertFactLayout({ hasBodySlot: Boolean(slots.default) })

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"
</script>

<template>
  <div class="pk-brick pk-fact" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-fact__body">
        <slot />
        <p v-if="source" class="pk-fact__src">{{ source }}</p>
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
  --pk-rule: rgba(0, 0, 0, 0.12);
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
  width: 100%;
  padding: 48px 72px 44px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
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
.pk-fact__body {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.75fr);
  column-gap: 48px;
  row-gap: 16px;
  align-content: center;
  align-items: center;
  position: relative;
}
.pk-fact__body::after {
  content: "";
  position: absolute;
  top: 18%;
  bottom: 18%;
  left: calc(1.15 / 1.9 * (100% - 48px) + 24px);
  width: 1px;
  background: var(--pk-rule);
  pointer-events: none;
}
.pk-fact__body :deep(h1) {
  grid-column: 1;
  grid-row: 1 / span 8;
  margin: 0;
  font-size: 84px;
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.045em;
  max-width: 9ch;
  align-self: center;
}
.pk-fact__body :deep(h1 ~ p),
.pk-fact__body :deep(h1 ~ ul) {
  grid-column: 2;
  margin: 0;
  padding: 0 0 0 8px;
  list-style: none;
  font-size: 22px;
  line-height: 1.4;
  color: var(--pk-sub);
  font-weight: 500;
  max-width: 22ch;
}
.pk-fact__body :deep(h1 ~ ul) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pk-fact__body :deep(li) {
  margin: 0;
  font-size: 22px;
  line-height: 1.4;
  color: var(--pk-sub);
  font-weight: 500;
}
.pk-fact__src {
  grid-column: 2;
  margin: 0;
  padding: 0 0 0 8px;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pk-faint);
  font-weight: 600;
  max-width: 22ch;
}
.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-rule: rgba(0, 0, 0, 0.12);
}
.pk-palette-ink,
.pk-palette-auto {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-rule: rgba(255, 255, 255, 0.18);
}
</style>
