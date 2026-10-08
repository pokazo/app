<script setup lang="ts">
export type CardItem = {
  title?: string
  body?: string
}

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  items?: CardItem[]
  /** Alias if model emits cards: */
  cards?: CardItem[]
}>()

const items = (props.items ?? props.cards ?? []).filter((it) => it.title?.trim()).slice(0, 4)

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"
</script>

<template>
  <div class="pk-brick pk-cards" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-title">
        <slot />
      </div>
      <div class="pk-cards__grid" :data-count="items.length">
        <div v-for="(it, i) in items" :key="i" class="pk-cards__card">
          <div class="pk-cards__n">{{ String(i + 1).padStart(2, "0") }}</div>
          <div class="pk-cards__card-title">{{ it.title }}</div>
          <div class="pk-cards__card-body">{{ it.body }}</div>
        </div>
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
  min-height: 0;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
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
.pk-title :deep(h1) {
  margin: 0 0 24px;
  font-size: 36px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.pk-title :deep(ul),
.pk-title :deep(p) {
  display: none;
}
.pk-cards__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
}
.pk-cards__grid[data-count="3"] {
  grid-template-columns: 1fr 1fr 1fr;
}
.pk-cards__card {
  background: var(--pk-card);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 22px 22px 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.pk-cards__n {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--pk-accent);
}
.pk-cards__card-title {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.25;
}
.pk-cards__card-body {
  font-size: 15px;
  line-height: 1.4;
  color: var(--pk-sub);
}
.pk-source {
  margin-top: 14px;
  text-align: right;
  font-size: 12px;
  color: var(--pk-faint);
  font-family: ui-monospace, monospace;
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
