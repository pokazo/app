<script setup lang="ts">
import { useSlots } from 'vue'
import { assertTwoColsLayout } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
}>()

const slots = useSlots()
assertTwoColsLayout({
  hasLeftSlot: Boolean(slots.left),
  hasRightSlot: Boolean(slots.right),
})

const paletteClass = resolvePaletteClass(props.palette)
</script>

<template>
  <div class="pk-brick pk-twocols" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-title">
        <slot />
      </div>
      <div class="pk-twocols__grid">
        <div class="pk-twocols__col">
          <slot name="left" />
        </div>
        <div class="pk-twocols__col">
          <slot name="right" />
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
  min-height: 0;
  box-sizing: border-box;
  justify-content: flex-start;
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
.pk-title {
  flex: none;
}
.pk-title :deep(h1) {
  margin: 0 0 24px;
  font-size: 34px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.pk-title :deep(ul),
.pk-title :deep(ol),
.pk-title :deep(p) {
  display: none;
}
.pk-twocols__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 28px;
  flex: 1 1 auto;
  min-height: 0;
  align-items: stretch;
  height: 100%;
}
.pk-twocols__col {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.pk-twocols__col :deep(h1),
.pk-twocols__col :deep(h2) {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
}
.pk-twocols__col :deep(> :first-child) {
  margin-top: 0;
}
.pk-twocols__col :deep(ul) {
  margin: 0;
  padding: 22px 20px;
  list-style: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 16px;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  background: var(--pk-card, #efe8dc);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 18px;
  box-sizing: border-box;
}
.pk-twocols__col :deep(li) {
  position: relative;
  padding-left: 1.15em;
  font-size: 19px;
  line-height: 1.4;
  color: var(--pk-ink);
}
.pk-twocols__col :deep(li)::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 0.45em;
  height: 0.45em;
  background: var(--pk-accent);
  border-radius: 1px;
}
.pk-twocols__col :deep(p) {
  margin: 0 0 10px;
  font-size: 18px;
  line-height: 1.45;
  color: var(--pk-sub);
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
