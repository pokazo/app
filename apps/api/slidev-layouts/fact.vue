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
      <div class="pk-fact__body">
        <slot />
      </div>
      <div v-if="source" class="pk-source">{{ source }}</div>
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
  padding: 40px 52px 32px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
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
.pk-fact__body {
  min-width: 0;
  width: 100%;
  max-width: none;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.pk-fact__body :deep(h1) {
  margin: 0;
  font-size: 52px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.03em;
  max-width: none;
  width: 100%;
}
.pk-fact__body :deep(p),
.pk-fact__body :deep(li) {
  margin: 22px 0 0;
  font-size: 24px;
  line-height: 1.4;
  color: var(--pk-sub);
  max-width: none;
  width: 100%;
}
.pk-fact__body :deep(ul) {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
}
.pk-source {
  margin-top: auto;
  padding-top: 20px;
  font-size: 12px;
  color: var(--pk-faint);
  font-family: ui-monospace, monospace;
  overflow-wrap: anywhere;
  flex: none;
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
