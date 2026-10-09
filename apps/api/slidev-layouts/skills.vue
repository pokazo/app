<script setup lang="ts">
import { assertSkillsLayout } from './layout-assert.js'

export type SkillItem = {
  name?: string
  level?: string
  pct?: number
}

const props = defineProps<{
  palette?: string

  kicker?: string
  source?: string
  items?: SkillItem[]
}>()

assertSkillsLayout(props)
const items = (props.items ?? []).slice(0, 8).map((it) => ({
  name: it.name ?? "",
  level: it.level ?? "",
  pct: Math.min(100, Math.max(8, Number(it.pct) || 70)),
}))

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"
</script>

<template>
  <div class="pk-brick pk-skills" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__frame" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-title">
        <slot />
      </div>
      <div class="pk-skills__wrap">
        <div class="pk-skills__list">
          <div v-for="(it, i) in items" :key="i" class="pk-skills__row">
            <div class="pk-skills__meta">
              <span class="pk-skills__name">{{ it.name }}</span>
              <span class="pk-skills__level">{{ it.level }}</span>
            </div>
            <div class="pk-skills__track">
              <div class="pk-skills__fill" :style="{ width: `${it.pct}%` }" />
            </div>
          </div>
        </div>
        <aside class="pk-skills__aside">
          <div class="pk-skills__aside-label">Инструменты</div>
          <div class="pk-skills__pills">
            <span v-for="(it, i) in items" :key="'p'+i" class="pk-skills__pill">{{ it.name }}</span>
          </div>
        </aside>
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
  --pk-card: #e8e4dc;
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
    linear-gradient(to right, rgba(225,6,0,0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(225,6,0,0.07) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}
.pk-brick__frame {
  display: none;
}
.pk-brick__inner {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 52px 64px 44px;
  display: flex;
  flex-direction: column;
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
  margin: 0 0 28px;
  font-size: 40px;
  line-height: 1.1;
  font-weight: 800;
}
.pk-title :deep(ul),
.pk-title :deep(p) {
  display: none;
}
.pk-skills__wrap {
  display: grid;
  grid-template-columns: 1.4fr 0.7fr;
  gap: 36px;
  flex: 1;
  min-height: 0;
}
.pk-skills__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pk-skills__aside {
  background: #f2f2f2;
  border-radius: 4px;
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pk-skills__aside-label {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--pk-faint);
  font-weight: 700;
}
.pk-skills__pills {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pk-skills__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #222;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  background: #fff;
  text-align: center;
}
.pk-skills__meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}
.pk-skills__name {
  font-size: 18px;
  font-weight: 700;
}
.pk-skills__level {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pk-accent);
  font-weight: 700;
}
.pk-skills__track {
  height: 10px;
  background: #111;
  border-radius: 99px;
  overflow: hidden;
}
.pk-skills__fill {
  height: 100%;
  background: var(--pk-accent);
  border-radius: 99px;
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
