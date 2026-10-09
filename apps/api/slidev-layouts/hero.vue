<script setup lang="ts">
const props = defineProps<{
  kicker?: string
  source?: string
  brand?: string
  image?: string
  palette?: string
  /** centered | fullbleed | editorial | product — never split */
  variant?: string
}>()

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"

const VARIANTS = new Set(["centered", "fullbleed", "editorial", "product"])
const variant =
  props.variant && VARIANTS.has(props.variant) ? props.variant : props.image ? "fullbleed" : "centered"

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
      <div class="pk-hero__plate">
        <div class="pk-brand" v-if="brand">
          <span class="pk-brand__mark" />
          <span class="pk-brand__text">{{ brand }}</span>
        </div>
        <div class="pk-kicker" v-if="kicker">
          <span class="pk-kicker__line" />
          <span class="pk-kicker__text">{{ kicker }}</span>
        </div>
        <div class="pk-hero__body">
          <slot />
        </div>
        <div v-if="source" class="pk-source">{{ source }}</div>
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
/* Default: plate is transparent pass-through (no photo / editorial pane already solid). */
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
.pk-source {
  font-size: 13px;
  color: var(--pk-faint);
  font-family: ui-monospace, monospace;
}

/* --- centered: brand/kicker/body centered; solid plate when photo has baked-in type --- */
.pk-hero--centered .pk-brick__pane {
  align-items: center;
  text-align: center;
  justify-content: center;
}
.pk-hero--centered .pk-hero__plate {
  align-items: center;
}
.pk-hero--centered.pk-hero--photo .pk-hero__veil {
  /* Wash out baked-in image lettering; plate carries our copy. */
  background: color-mix(in srgb, var(--pk-paper) 92%, transparent);
}
.pk-hero--centered.pk-hero--photo .pk-hero__photo img {
  /* Soften remaining photo type at the edges */
  filter: blur(1.2px) saturate(0.9);
  transform: scale(1.03);
}
.pk-hero--centered.pk-hero--photo .pk-hero__plate {
  background: var(--pk-paper);
  padding: 36px 44px 32px;
  border-radius: 28px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
  max-width: min(780px, 92%);
}
.pk-hero--centered .pk-brand,
.pk-hero--centered .pk-kicker {
  justify-content: center;
  margin-bottom: 16px;
}
.pk-hero--centered .pk-brand {
  margin-bottom: 12px;
}
.pk-hero--centered .pk-hero__body {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pk-hero--centered .pk-hero__body :deep(h1) {
  max-width: min(16em, 100%);
  font-size: 44px;
}
.pk-hero--centered .pk-hero__body :deep(p) {
  max-width: min(36em, 100%);
}
.pk-hero--centered .pk-source {
  margin-top: 20px;
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
  justify-content: flex-end;
  padding-bottom: 56px;
}
.pk-hero--fullbleed .pk-brand {
  margin-bottom: auto;
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

/* --- editorial: asymmetric type, photo as right-biased crop --- */
.pk-hero--editorial .pk-hero__photo {
  inset: 0 0 0 42%;
  clip-path: polygon(6% 0, 100% 0, 100% 100%, 0 100%);
}
.pk-hero--editorial .pk-hero__veil {
  /* Near-opaque wash — any baked-in slogan must be unreadable */
  background: linear-gradient(
    90deg,
    var(--pk-paper) 0%,
    rgba(18, 18, 20, 0.82) 16%,
    rgba(18, 18, 20, 0.88) 100%
  );
}
.pk-hero--editorial .pk-hero__photo img {
  object-position: 82% center;
  filter: blur(6px) brightness(0.62) saturate(1.1);
  transform: scale(1.08);
}
.pk-hero--editorial .pk-brick__pane {
  width: 52%;
  background: var(--pk-paper);
  justify-content: center;
  padding-right: 36px;
}
.pk-hero--editorial .pk-hero__plate {
  width: 100%;
  align-items: flex-start;
  text-align: left;
}
.pk-hero--editorial .pk-brand {
  margin-bottom: 28px;
}
.pk-hero--editorial .pk-kicker {
  margin-bottom: 18px;
}
.pk-hero--editorial .pk-hero__body {
  margin: 0;
}
.pk-hero--editorial .pk-hero__body :deep(h1) {
  font-size: 42px;
  line-height: 1.16;
  max-width: none;
  width: 100%;
  letter-spacing: -0.03em;
}
.pk-hero--editorial .pk-hero__body :deep(p) {
  max-width: none;
  width: 100%;
  font-size: 18px;
  line-height: 1.4;
}
.pk-hero--editorial:not(.pk-hero--photo) .pk-brick__pane {
  width: 100%;
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
</style>
