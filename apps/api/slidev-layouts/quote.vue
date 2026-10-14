<script setup lang="ts">
import { useSlots } from 'vue'
import { assertQuoteLayout } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
}>()

const slots = useSlots()
assertQuoteLayout({ hasBodySlot: Boolean(slots.default) })

const paletteClass = resolvePaletteClass(props.palette)
</script>

<template>
  <div class="pk-brick pk-quote" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-quote__stage">
        <div class="pk-quote__pull">
          <span class="pk-quote__rule" aria-hidden />
          <div class="pk-quote__body">
            <slot />
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
  padding: 48px 72px 44px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
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
.pk-quote__stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
}
.pk-quote__pull {
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr);
  gap: 36px;
  align-items: stretch;
  width: min(920px, 100%);
}
.pk-quote__rule {
  display: block;
  width: 6px;
  border-radius: 3px;
  background: var(--pk-accent);
  min-height: 100%;
}
.pk-quote__body {
  min-width: 0;
  padding: 4px 0;
}
.pk-quote__body :deep(h1),
.pk-quote__body :deep(p),
.pk-quote__body :deep(blockquote) {
  margin: 0 0 20px;
  font-size: 48px;
  line-height: 1.18;
  font-weight: 800;
  letter-spacing: -0.035em;
  max-width: 18ch;
}
.pk-quote__body :deep(ul) {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pk-quote__body :deep(li) {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--pk-sub);
  letter-spacing: -0.01em;
}
.pk-quote__body :deep(li::before) {
  content: none;
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
}
.pk-palette-forest {
  --pk-paper: #eef2eb;
  --pk-ink: #1c2a1f;
  --pk-sub: #3d4d42;
  --pk-accent: #3d6b4f;
  --pk-faint: #6b7a70;
}
.pk-palette-slate {
  --pk-paper: #1e2228;
  --pk-ink: #f0f2f5;
  --pk-sub: #c5c9d0;
  --pk-accent: #6b9bd1;
  --pk-faint: #8a9099;
}
.pk-palette-amber {
  --pk-paper: #1a1814;
  --pk-ink: #f5f0e6;
  --pk-sub: #d4cbb8;
  --pk-accent: #c9a227;
  --pk-faint: #9a9180;
}
.pk-palette-wine {
  --pk-paper: #1f1418;
  --pk-ink: #f6ecef;
  --pk-sub: #d4c0c6;
  --pk-accent: #8b3a4a;
  --pk-faint: #9a8088;
}
</style>
