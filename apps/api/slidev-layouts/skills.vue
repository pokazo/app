<script setup lang="ts">
import { assertSkillsLayout } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

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

const paletteClass = resolvePaletteClass(props.palette)
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
.pk-palette-ocean {
  --pk-paper: #e8eef2;
  --pk-ink: #1a2b3c;
  --pk-sub: #3d5266;
  --pk-accent: #2d6a8f;
  --pk-faint: #6b7f8f;
  --pk-card: #dce6ee;
}
.pk-palette-forest {
  --pk-paper: #eef2eb;
  --pk-ink: #1c2a1f;
  --pk-sub: #3d4d42;
  --pk-accent: #3d6b4f;
  --pk-faint: #6b7a70;
  --pk-card: #e0e8dc;
}
.pk-palette-frost {
  --pk-paper: #f0f5f8;
  --pk-ink: #152633;
  --pk-sub: #3d5260;
  --pk-accent: #4a7c9b;
  --pk-faint: #6b8290;
  --pk-card: #e2ebf0;
}
.pk-palette-slate {
  --pk-paper: #1e2228;
  --pk-ink: #f0f2f5;
  --pk-sub: #c5c9d0;
  --pk-accent: #6b9bd1;
  --pk-faint: #8a9099;
  --pk-card: #2a3038;
}
.pk-palette-amber {
  --pk-paper: #1a1814;
  --pk-ink: #f5f0e6;
  --pk-sub: #d4cbb8;
  --pk-accent: #c9a227;
  --pk-faint: #9a9180;
  --pk-card: #2a2620;
}
.pk-palette-wine {
  --pk-paper: #1f1418;
  --pk-ink: #f6ecef;
  --pk-sub: #d4c0c6;
  --pk-accent: #8b3a4a;
  --pk-faint: #9a8088;
  --pk-card: #2e2228;
}
</style>
