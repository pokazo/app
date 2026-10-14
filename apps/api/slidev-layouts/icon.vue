<script setup lang="ts">
import { computed } from 'vue'
import { assertIconLayout, renderCarbonSvg, resolveCarbonIconName } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  /** Outline hint, e.g. carbon-idea — rendered as Carbon SVG when available */
  iconHint?: string
}>()

assertIconLayout(props)

const label = (resolveCarbonIconName(props.iconHint) ?? props.iconHint ?? "")
  .replace(/^(carbon|mdi)-/i, "")
  .replace(/-/g, " ")
  .trim()

const svg = computed(() => renderCarbonSvg(props.iconHint, "88px"))

const paletteClass = resolvePaletteClass(props.palette)
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
        <div class="pk-icon__mark" aria-hidden>
          <svg
            v-if="svg"
            class="pk-icon__svg"
            v-bind="svg.attributes"
            v-html="svg.body"
          />
          <span v-else class="pk-icon__fallback">{{ label ? label.slice(0, 1).toUpperCase() : "◇" }}</span>
          <span v-if="label" class="pk-icon__hint">{{ label }}</span>
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
  --pk-rule: rgba(0, 0, 0, 0.1);
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
  padding: 48px 72px 44px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
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
  grid-template-columns: 200px 1fr;
  gap: 48px;
  align-items: center;
  flex: 1;
  min-height: 0;
}
.pk-icon__mark {
  width: 200px;
  min-height: 200px;
  border: 1px solid var(--pk-rule);
  background: var(--pk-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--pk-accent);
}
.pk-icon__svg {
  display: block;
  color: var(--pk-accent);
}
.pk-icon__fallback {
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  color: var(--pk-accent);
}
.pk-icon__hint {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pk-sub);
}
.pk-icon__body {
  min-width: 0;
}
.pk-icon__body :deep(h1) {
  margin: 0 0 22px;
  font-size: 40px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.035em;
}
.pk-icon__body :deep(ul) {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pk-icon__body :deep(li) {
  position: relative;
  padding-left: 1.15em;
  font-size: 20px;
  line-height: 1.4;
  color: var(--pk-sub);
  font-weight: 500;
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
  --pk-rule: rgba(0, 0, 0, 0.1);
}
.pk-palette-ink,
.pk-palette-auto {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-card: #25282d;
  --pk-rule: rgba(255, 255, 255, 0.14);
}
.pk-palette-ocean {
  --pk-paper: #e8eef2;
  --pk-ink: #1a2b3c;
  --pk-sub: #3d5266;
  --pk-accent: #2d6a8f;
  --pk-faint: #6b7f8f;
  --pk-card: #dce6ee;
  --pk-rule: rgba(0, 0, 0, 0.1);
}
.pk-palette-forest {
  --pk-paper: #eef2eb;
  --pk-ink: #1c2a1f;
  --pk-sub: #3d4d42;
  --pk-accent: #3d6b4f;
  --pk-faint: #6b7a70;
  --pk-card: #e0e8dc;
  --pk-rule: rgba(0, 0, 0, 0.1);
}
.pk-palette-frost {
  --pk-paper: #f0f5f8;
  --pk-ink: #152633;
  --pk-sub: #3d5260;
  --pk-accent: #4a7c9b;
  --pk-faint: #6b8290;
  --pk-card: #e2ebf0;
  --pk-rule: rgba(0, 0, 0, 0.1);
}
.pk-palette-slate {
  --pk-paper: #1e2228;
  --pk-ink: #f0f2f5;
  --pk-sub: #c5c9d0;
  --pk-accent: #6b9bd1;
  --pk-faint: #8a9099;
  --pk-card: #2a3038;
  --pk-rule: rgba(255, 255, 255, 0.14);
}
.pk-palette-amber {
  --pk-paper: #1a1814;
  --pk-ink: #f5f0e6;
  --pk-sub: #d4cbb8;
  --pk-accent: #c9a227;
  --pk-faint: #9a9180;
  --pk-card: #2a2620;
  --pk-rule: rgba(255, 255, 255, 0.14);
}
.pk-palette-wine {
  --pk-paper: #1f1418;
  --pk-ink: #f6ecef;
  --pk-sub: #d4c0c6;
  --pk-accent: #8b3a4a;
  --pk-faint: #9a8088;
  --pk-card: #2e2228;
  --pk-rule: rgba(255, 255, 255, 0.14);
}
</style>
