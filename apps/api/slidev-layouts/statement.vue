<script setup lang="ts">
import { useSlots } from 'vue'
import { assertStatementLayout } from './layout-assert.js'

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
}>()

const slots = useSlots()
assertStatementLayout({ hasBodySlot: Boolean(slots.default) })

const paletteClass =
  props.palette === "cream" ? "pk-palette-cream" : "pk-palette-ink"
</script>

<template>
  <div class="pk-brick pk-statement" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-statement__stage">
        <div class="pk-statement__body">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pk-brick {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-rule: rgba(255, 255, 255, 0.55);
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
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}
.pk-brick__inner {
  position: relative;
  z-index: 1;
  height: 100%;
  width: 100%;
  padding: 48px 72px 64px;
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
.pk-statement__stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: flex-end;
}
.pk-statement__body {
  width: min(920px, 100%);
}
.pk-statement__body :deep(h1) {
  margin: 0 0 28px;
  font-size: 64px;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.04em;
  max-width: 14ch;
}
.pk-statement__body :deep(p),
.pk-statement__body :deep(ul) {
  margin: 0;
  padding: 0 0 0 20px;
  border-left: 2px solid var(--pk-rule);
  list-style: none;
  max-width: 42ch;
  font-size: 20px;
  line-height: 1.45;
  color: var(--pk-sub);
  font-weight: 500;
}
.pk-statement__body :deep(li) {
  margin: 0;
}
.pk-statement__body :deep(li + li) {
  margin-top: 8px;
}
.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-rule: rgba(0, 0, 0, 0.35);
}
.pk-palette-cream .pk-brick__grid {
  background-image:
    linear-gradient(to right, rgba(225, 6, 0, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(225, 6, 0, 0.06) 1px, transparent 1px);
}
.pk-palette-ink {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-rule: rgba(255, 255, 255, 0.55);
}
</style>
