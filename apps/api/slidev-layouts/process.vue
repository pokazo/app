<script setup lang="ts">
import { computed } from 'vue'
import { assertProcessLayout, isLayoutCarbonIcon, renderCarbonSvg } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

export type ProcessStep = {
  title?: string
  iconHint?: string
}

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  steps?: ProcessStep[]
}>()

assertProcessLayout(props)

const steps = computed(() =>
  (props.steps ?? [])
    .filter((it) => it.title?.trim() && isLayoutCarbonIcon(it.iconHint))
    .slice(0, 5)
    .map((it) => ({
      title: it.title ?? "",
      svg: renderCarbonSvg(it.iconHint, "36px"),
    })),
)

const paletteClass = resolvePaletteClass(props.palette)
</script>

<template>
  <div class="pk-brick pk-process" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-process__head">
        <div class="pk-kicker" v-if="kicker">
          <span class="pk-kicker__line" />
          <span class="pk-kicker__text">{{ kicker }}</span>
        </div>
        <div class="pk-title">
          <slot />
        </div>
      </div>
      <div class="pk-process__row">
        <template v-for="(s, i) in steps" :key="i">
          <div class="pk-process__step">
            <div class="pk-process__circle" aria-hidden>
              <svg v-if="s.svg" v-bind="s.svg.attributes" v-html="s.svg.body" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <div class="pk-process__label">{{ s.title }}</div>
          </div>
          <div v-if="i < steps.length - 1" class="pk-process__arrow" aria-hidden>▸</div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pk-brick {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #9eb3c7;
  --pk-faint: #8a8c8f;
  --pk-ring: #9eb3c7;
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
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}
.pk-brick__inner {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 56px 64px 48px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.pk-process__head {
  text-align: center;
  margin-bottom: 48px;
}
.pk-kicker {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
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
  margin: 0;
  font-size: 44px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.035em;
}
.pk-process__row {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.pk-process__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 140px;
}
.pk-process__circle {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 3px solid var(--pk-ring);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pk-ink);
  font-size: 28px;
  font-weight: 800;
}
.pk-process__label {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--pk-ink);
  max-width: 12ch;
}
.pk-process__arrow {
  font-size: 22px;
  color: var(--pk-ring);
  margin-bottom: 34px;
  line-height: 1;
}
.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-ring: #c45c26;
}
.pk-palette-cream .pk-brick__grid {
  background-image:
    linear-gradient(to right, rgba(225, 6, 0, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(225, 6, 0, 0.06) 1px, transparent 1px);
}
.pk-palette-ink {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #9eb3c7;
  --pk-faint: #8a8c8f;
  --pk-ring: #9eb3c7;
}
.pk-palette-ocean {
  --pk-paper: #e8eef2;
  --pk-ink: #1a2b3c;
  --pk-sub: #3d5266;
  --pk-accent: #2d6a8f;
  --pk-faint: #6b7f8f;
  --pk-ring: #2d6a8f;
}
.pk-palette-forest {
  --pk-paper: #eef2eb;
  --pk-ink: #1c2a1f;
  --pk-sub: #3d4d42;
  --pk-accent: #3d6b4f;
  --pk-faint: #6b7a70;
  --pk-ring: #3d6b4f;
}
.pk-palette-frost {
  --pk-paper: #f0f5f8;
  --pk-ink: #152633;
  --pk-sub: #3d5260;
  --pk-accent: #4a7c9b;
  --pk-faint: #6b8290;
  --pk-ring: #4a7c9b;
}
.pk-palette-slate {
  --pk-paper: #1e2228;
  --pk-ink: #f0f2f5;
  --pk-sub: #c5c9d0;
  --pk-accent: #6b9bd1;
  --pk-faint: #8a9099;
  --pk-ring: #6b9bd1;
}
.pk-palette-amber {
  --pk-paper: #1a1814;
  --pk-ink: #f5f0e6;
  --pk-sub: #d4cbb8;
  --pk-accent: #c9a227;
  --pk-faint: #9a9180;
  --pk-ring: #c9a227;
}
.pk-palette-wine {
  --pk-paper: #1f1418;
  --pk-ink: #f6ecef;
  --pk-sub: #d4c0c6;
  --pk-accent: #8b3a4a;
  --pk-faint: #9a8088;
  --pk-ring: #8b3a4a;
}

.pk-palette-ocean .pk-brick__grid,
.pk-palette-forest .pk-brick__grid,
.pk-palette-frost .pk-brick__grid {
  background-image:
    linear-gradient(to right, rgba(45, 106, 143, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(45, 106, 143, 0.08) 1px, transparent 1px);
}

</style>
