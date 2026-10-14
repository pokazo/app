<script setup lang="ts">
import { assertHeroLayout } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

const props = defineProps<{
  kicker?: string
  source?: string
  brand?: string
  image?: string
  palette?: string
  /** ribbon | corner | inset | fullbleed | product — never split/centered/editorial */
  variant?: string
}>()

assertHeroLayout(props)

const paletteClass = resolvePaletteClass(props.palette)

const variant = props.variant!.trim()

function photoSrc(image?: string) {
  if (!image) return ""
  const base = import.meta.env.BASE_URL || "/"
  const path = image.startsWith("/") ? image.slice(1) : image
  return `${base}${path}`
}
</script>

<template>
  <div
    class="pk-brick pk-hero"
    :class="[paletteClass, `pk-hero--${variant}`, { 'pk-hero--photo': Boolean(props.image) }]"
  >
    <div v-if="props.image" class="pk-hero__photo" aria-hidden="true">
      <img :src="photoSrc(props.image)" alt="" />
      <div class="pk-hero__veil" />
    </div>

    <div class="pk-brick__pane">
      <div class="pk-brand" v-if="brand">
        <span class="pk-brand__mark" />
        <span class="pk-brand__text">{{ brand }}</span>
      </div>
      <div class="pk-hero__plate">
        <div class="pk-kicker" v-if="kicker">
          <span class="pk-kicker__line" />
          <span class="pk-kicker__text">{{ kicker }}</span>
        </div>
        <div class="pk-hero__body">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pk-brick {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-veil: rgba(247, 243, 236, 0.55);
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--pk-paper);
  color: var(--pk-ink);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-veil: rgba(247, 243, 236, 0.55);
}
.pk-palette-ink,
.pk-palette-auto {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-veil: rgba(25, 27, 30, 0.45);
}

.pk-hero__photo {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background-color: #1a1a1a;
}
.pk-hero__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pk-hero__veil {
  position: absolute;
  inset: 0;
  background: var(--pk-veil);
  pointer-events: none;
}

.pk-brick__pane {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  color: var(--pk-ink);
  box-sizing: border-box;
}
.pk-brick__pane > .pk-brand {
  flex: none;
}
/* Default: plate is transparent pass-through. */
.pk-hero__plate {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
}
.pk-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: auto;
}
.pk-brand__mark {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: var(--pk-accent);
  flex: none;
}
.pk-brand__text {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.pk-kicker__line {
  width: 36px;
  height: 3px;
  background: var(--pk-accent);
  border-radius: 2px;
  flex: none;
}
.pk-kicker__text {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--pk-accent);
}
.pk-hero__body {
  margin-top: auto;
  margin-bottom: auto;
}
.pk-hero__body :deep(h1),
.pk-hero__body :deep(p),
.pk-hero__body :deep(li) {
  color: var(--pk-ink);
  opacity: 1;
}
.pk-hero__body :deep(h1) {
  margin: 0 0 24px;
  font-size: 48px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.03em;
  max-width: min(18em, 92%);
}
.pk-hero__body :deep(ul) {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.pk-hero__body :deep(li) {
  font-size: 20px;
  line-height: 1.45;
  color: var(--pk-sub);
  margin: 0 0 8px;
}
.pk-hero__body :deep(p) {
  font-size: 20px;
  line-height: 1.45;
  color: var(--pk-sub);
  max-width: 36ch;
  margin: 0;
}

/* --- ribbon: full photo; brand top-left; paper band with type across lower third --- */
.pk-hero--ribbon .pk-hero__veil {
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.05) 40%,
    rgba(0, 0, 0, 0.35) 100%
  );
}
.pk-hero--ribbon .pk-brick__pane {
  justify-content: flex-end;
  padding: 48px 0 18%;
}
.pk-hero--ribbon .pk-brand {
  position: absolute;
  top: 48px;
  left: 56px;
  margin: 0;
  color: #fff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.pk-hero--ribbon .pk-hero__plate {
  width: 100%;
  background: color-mix(in srgb, var(--pk-paper) 94%, transparent);
  backdrop-filter: blur(8px);
  padding: 36px 56px 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.25);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
.pk-hero--ribbon .pk-kicker {
  margin-bottom: 14px;
}
.pk-hero--ribbon .pk-hero__body {
  margin: 0;
}
.pk-hero--ribbon .pk-hero__body :deep(h1) {
  font-size: 52px;
  max-width: min(18em, 100%);
}

/* --- corner: full photo; brand top-left; compact type bottom-right --- */
.pk-hero--corner .pk-hero__veil {
  background: linear-gradient(
    225deg,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0.15) 45%,
    rgba(0, 0, 0, 0.55) 100%
  );
}
.pk-hero--corner.pk-palette-cream {
  --pk-ink: #ffffff;
  --pk-sub: #e8e4dc;
  --pk-faint: #cfc9bd;
}
.pk-hero--corner .pk-brick__pane {
  justify-content: flex-end;
  align-items: flex-end;
  padding: 48px 56px 56px;
}
.pk-hero--corner .pk-brand {
  position: absolute;
  top: 48px;
  left: 56px;
  margin: 0;
  color: #fff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.pk-hero--corner .pk-hero__plate {
  max-width: min(520px, 92%);
  text-align: left;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
}
.pk-hero--corner .pk-kicker {
  margin-bottom: 18px;
}
.pk-hero--corner .pk-hero__body {
  margin: 0;
}
.pk-hero--corner .pk-hero__body :deep(h1) {
  font-size: 44px;
  max-width: 12em;
}

/* --- inset: paper field + framed photo window on the right --- */
.pk-hero--inset .pk-hero__photo {
  inset: 80px 80px 80px 52%;
  border-radius: 4px;
}
.pk-hero--inset .pk-hero__veil {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.05) 100%
  );
}
.pk-hero--inset .pk-brick__pane {
  width: min(48%, 720px);
  justify-content: center;
  padding: 48px 40px 48px 72px;
  background: transparent;
}
.pk-hero--inset .pk-brand {
  margin-bottom: 28px;
}
.pk-hero--inset .pk-kicker {
  margin-bottom: 18px;
}
.pk-hero--inset .pk-hero__body {
  margin: 0;
}
.pk-hero--inset .pk-hero__body :deep(h1) {
  font-size: 46px;
  max-width: 14em;
}
.pk-hero--inset:not(.pk-hero--photo) .pk-brick__pane {
  width: 100%;
}

/* --- fullbleed: strong photo, light veil, text bottom-left --- */
.pk-hero--fullbleed .pk-hero__veil {
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.55) 55%,
    rgba(0, 0, 0, 0.78) 100%
  );
}
.pk-hero--fullbleed.pk-palette-cream {
  --pk-ink: #ffffff;
  --pk-sub: #e8e4dc;
  --pk-faint: #cfc9bd;
}
.pk-hero--fullbleed .pk-brick__pane {
  justify-content: flex-start;
  padding-bottom: 56px;
}
.pk-hero--fullbleed .pk-brand {
  margin-bottom: auto;
}
.pk-hero--fullbleed .pk-hero__plate {
  margin-top: auto;
}
.pk-hero--fullbleed .pk-hero__body {
  margin: 0;
}
.pk-hero--fullbleed .pk-hero__body :deep(h1) {
  max-width: min(14em, 100%);
  font-size: 54px;
}
/* Fullbleed: dark gradient already; add text shadow so pale image type cannot compete. */
.pk-hero--fullbleed.pk-hero--photo .pk-hero__plate {
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
}

/* --- product: large visual stage + promise band --- */
.pk-hero--product {
  display: grid;
  grid-template-rows: 1fr auto;
}
.pk-hero--product .pk-hero__photo {
  inset: auto;
  position: relative;
  height: 100%;
  min-height: 0;
}
.pk-hero--product .pk-hero__veil {
  background: transparent;
}
.pk-hero--product .pk-brick__pane {
  height: auto;
  background: var(--pk-paper);
  padding: 28px 48px 36px;
  justify-content: flex-start;
  gap: 8px;
}
.pk-hero--product .pk-brand {
  margin-bottom: 0;
}
.pk-hero--product .pk-kicker {
  margin-bottom: 8px;
}
.pk-hero--product .pk-hero__body {
  margin: 0;
}
.pk-hero--product .pk-hero__body :deep(h1) {
  font-size: 36px;
  max-width: 22ch;
  margin-bottom: 10px;
}
.pk-hero--product .pk-hero__body :deep(p) {
  font-size: 18px;
  max-width: 40ch;
}
.pk-hero--product:not(.pk-hero--photo) {
  display: block;
}
.pk-hero--product:not(.pk-hero--photo) .pk-brick__pane {
  height: 100%;
  justify-content: center;
  padding: 48px 56px;
}
.pk-palette-ocean {
  --pk-paper: #e8eef2;
  --pk-ink: #1a2b3c;
  --pk-sub: #3d5266;
  --pk-accent: #2d6a8f;
  --pk-faint: #6b7f8f;
  --pk-veil: rgba(232, 238, 242, 0.55);
}
.pk-palette-forest {
  --pk-paper: #eef2eb;
  --pk-ink: #1c2a1f;
  --pk-sub: #3d4d42;
  --pk-accent: #3d6b4f;
  --pk-faint: #6b7a70;
  --pk-veil: rgba(238, 242, 235, 0.55);
}
.pk-palette-slate {
  --pk-paper: #1e2228;
  --pk-ink: #f0f2f5;
  --pk-sub: #c5c9d0;
  --pk-accent: #6b9bd1;
  --pk-faint: #8a9099;
  --pk-veil: rgba(30, 34, 40, 0.45);
}
.pk-palette-amber {
  --pk-paper: #1a1814;
  --pk-ink: #f5f0e6;
  --pk-sub: #d4cbb8;
  --pk-accent: #c9a227;
  --pk-faint: #9a9180;
  --pk-veil: rgba(26, 24, 20, 0.45);
}
.pk-palette-wine {
  --pk-paper: #1f1418;
  --pk-ink: #f6ecef;
  --pk-sub: #d4c0c6;
  --pk-accent: #8b3a4a;
  --pk-faint: #9a8088;
  --pk-veil: rgba(31, 20, 24, 0.45);
}

.pk-hero--corner.pk-palette-ocean,
.pk-hero--corner.pk-palette-forest,
.pk-hero--fullbleed.pk-palette-ocean,
.pk-hero--fullbleed.pk-palette-forest {
  --pk-ink: #ffffff;
  --pk-sub: #e8e4dc;
  --pk-faint: #cfc9bd;
}

</style>
