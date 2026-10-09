<script setup lang="ts">
import { assertTimelineLayout } from './layout-assert.js'

export type TimelineStep = {
  phase?: string
  title?: string
  body?: string
  state?: 'done' | 'current' | 'todo'
}

const props = defineProps<{
  palette?: string

  kicker?: string
  source?: string
  steps?: TimelineStep[]
}>()

assertTimelineLayout(props)
const steps = (props.steps ?? []).slice(0, 5)
const doneCount = steps.filter(s => s.state !== 'todo' && s.state !== 'current').length
const progress = steps.length
  ? ((steps.findIndex(s => s.state === 'current') >= 0
      ? steps.findIndex(s => s.state === 'current')
      : doneCount) / Math.max(1, steps.length - 1)) * 100
  : 0

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"
</script>

<template>
  <div class="pk-brick pk-timeline" :class="paletteClass">
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
      <div class="pk-timeline__rail" v-if="steps.length">
        <div class="pk-timeline__track" />
        <div class="pk-timeline__progress" :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }" />
        <div class="pk-timeline__cols" :style="{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }">
          <div v-for="(s, i) in steps" :key="i" class="pk-timeline__col" :data-state="s.state || 'done'">
            <div class="pk-timeline__phase">{{ s.phase }}</div>
            <div class="pk-timeline__dot" />
            <h3 class="pk-timeline__h">{{ s.title }}</h3>
            <p class="pk-timeline__body">{{ s.body }}</p>
          </div>
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
  padding: 56px 64px 48px;
  display: flex;
  flex-direction: column;
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
.pk-title :deep(h1) {
  margin: 0 0 48px;
  font-size: 36px;
  line-height: 1.15;
  font-weight: 800;
  max-width: 92%;
}
.pk-title :deep(p),
.pk-title :deep(ul) {
  display: none;
}
.pk-timeline__rail {
  position: relative;
  margin-top: auto;
}
.pk-timeline__track,
.pk-timeline__progress {
  position: absolute;
  left: 0;
  top: 42px;
  height: 3px;
}
.pk-timeline__track {
  right: 0;
  background: var(--pk-card);
}
.pk-timeline__progress {
  background: var(--pk-accent);
}
.pk-timeline__cols {
  display: grid;
  gap: 28px;
}
.pk-timeline__phase {
  font-size: 14px;
  color: var(--pk-accent);
  height: 24px;
  font-family: ui-monospace, monospace;
}
.pk-timeline__col[data-state="current"] .pk-timeline__phase,
.pk-timeline__col[data-state="todo"] .pk-timeline__phase {
  color: var(--pk-sub);
}
.pk-timeline__dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--pk-paper);
  border: 4px solid var(--pk-accent);
  margin: 8px 0 22px;
  position: relative;
  z-index: 1;
}
.pk-timeline__col[data-state="current"] .pk-timeline__dot,
.pk-timeline__col[data-state="todo"] .pk-timeline__dot {
  background: var(--pk-paper);
  border-color: #d0d0d0;
}
.pk-timeline__h {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
}
.pk-timeline__col[data-state="current"] .pk-timeline__h,
.pk-timeline__col[data-state="todo"] .pk-timeline__h {
  color: var(--pk-sub);
}
.pk-timeline__body {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--pk-sub);
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
