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
  <div class="pk-brick pk-quote" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-quote__row">
        <div class="pk-quote__body">
          <slot />
        </div>
        <div class="pk-quote__mark" aria-hidden>“</div>
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
  margin-bottom: 12px;
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
.pk-quote__row {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(140px, 0.6fr);
  gap: 24px;
  align-items: center;
}
.pk-quote__body {
  min-width: 0;
}
.pk-quote__body :deep(h1),
.pk-quote__body :deep(p),
.pk-quote__body :deep(blockquote) {
  margin: 0 0 14px;
  font-size: 30px;
  line-height: 1.28;
  font-weight: 700;
  letter-spacing: -0.02em;
  max-width: none;
}
.pk-quote__body :deep(ul) {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pk-quote__body :deep(li) {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--pk-sub);
}
.pk-quote__body :deep(li::before) {
  content: none;
}
.pk-quote__mark {
  font-size: 180px;
  line-height: 0.85;
  font-weight: 800;
  color: var(--pk-accent);
  opacity: 0.22;
  text-align: right;
  user-select: none;
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
