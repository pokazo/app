<script setup lang="ts">
import { computed } from 'vue'
import { icons as carbonIcons } from '@iconify-json/carbon'
import { assertIconLayout } from './layout-assert.js'

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  /** Outline hint, e.g. carbon-idea — rendered as Carbon SVG when available */
  iconHint?: string
}>()

assertIconLayout(props)

const label = (props.iconHint ?? "").replace(/^(carbon|mdi)-/i, "").replace(/-/g, " ").trim()

type SvgRender = { attributes: Record<string, string>; body: string }

function renderCarbonIcon(name: string, heightPx: string): SvgRender | null {
  const icon = carbonIcons.icons?.[name]
  if (!icon?.body) return null
  const w = icon.width ?? carbonIcons.width ?? 32
  const h = icon.height ?? carbonIcons.height ?? 32
  return {
    attributes: {
      width: heightPx,
      height: heightPx,
      viewBox: `0 0 ${w} ${h}`,
      xmlns: "http://www.w3.org/2000/svg",
      fill: "currentColor",
    },
    body: icon.body,
  }
}

const svg = computed(() => {
  const hint = (props.iconHint ?? "").trim()
  const m = hint.match(/^carbon-(.+)$/i)
  if (!m?.[1]) return null
  return renderCarbonIcon(m[1], "88px")
})

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
</style>
