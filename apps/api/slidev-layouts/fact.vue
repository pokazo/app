<script setup lang="ts">
const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
}>()

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
      <div class="pk-fact__row">
        <div class="pk-fact__body">
          <slot />
        </div>
        <div class="pk-fact__accent" aria-hidden>
          <span class="pk-fact__glyph">◆</span>
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
  --pk-panel: #f2f2f2;
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
  padding: 40px 48px 28px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
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
.pk-fact__row {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(180px, 0.65fr);
  gap: 36px;
  align-items: stretch;
}
.pk-fact__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.pk-fact__body :deep(h1) {
  margin: 0;
  font-size: 44px;
  line-height: 1.14;
  font-weight: 800;
  letter-spacing: -0.03em;
  max-width: none;
}
.pk-fact__body :deep(p),
.pk-fact__body :deep(li) {
  margin: 18px 0 0;
  font-size: 20px;
  line-height: 1.4;
  color: var(--pk-sub);
  max-width: none;
}
.pk-fact__body :deep(ul) {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
}
.pk-fact__accent {
  background: var(--pk-panel);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
}
.pk-fact__glyph {
  font-size: 96px;
  line-height: 1;
  color: var(--pk-accent);
  opacity: 0.9;
}
.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-panel: #efe8dc;
}
.pk-palette-ink,
.pk-palette-auto {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-panel: #25282d;
}
</style>
