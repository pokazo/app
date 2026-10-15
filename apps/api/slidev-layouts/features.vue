<script setup lang="ts">
import { computed } from 'vue'
import { assertFeaturesLayout, isLayoutCarbonIcon, renderCarbonSvg } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

export type FeatureItem = {
  title?: string
  body?: string
  iconHint?: string
}

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  items?: FeatureItem[]
  features?: FeatureItem[]
}>()

assertFeaturesLayout(props)

const items = computed(() =>
  (props.items?.length ? props.items : props.features ?? [])
    .filter((it) => it.title?.trim() && isLayoutCarbonIcon(it.iconHint))
    .slice(0, 3)
    .map((it) => ({
      title: it.title ?? "",
      body: it.body ?? "",
      svg: renderCarbonSvg(it.iconHint, "40px"),
    })),
)

const paletteClass = resolvePaletteClass(props.palette)
</script>

<template>
  <div class="pk-brick pk-features" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-title">
        <slot />
      </div>
      <div class="pk-features__rule" aria-hidden />
      <div class="pk-features__grid">
        <div v-for="(it, i) in items" :key="i" class="pk-features__col">
          <div class="pk-features__icon" aria-hidden>
            <svg v-if="it.svg" v-bind="it.svg.attributes" v-html="it.svg.body" />
            <span v-else class="pk-features__fallback">◆</span>
          </div>
          <h3 class="pk-features__h">{{ it.title }}</h3>
          <p class="pk-features__p">{{ it.body }}</p>
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
  --pk-rule: rgba(0, 0, 0, 0.12);
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
  padding: 48px 64px 44px;
  display: flex;
  flex-direction: column;
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
.pk-title :deep(h1) {
  margin: 0 0 12px;
  font-size: 40px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.035em;
  max-width: 22ch;
}
.pk-title :deep(p) {
  margin: 0 0 8px;
  font-size: 18px;
  line-height: 1.4;
  color: var(--pk-sub);
  max-width: 52ch;
}
.pk-features__rule {
  height: 1px;
  background: var(--pk-rule);
  margin: 20px 0 28px;
  flex: none;
}
.pk-features__grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 36px;
  align-content: start;
}
.pk-features__icon {
  width: 48px;
  height: 48px;
  color: var(--pk-ink);
  margin-bottom: 18px;
  display: flex;
  align-items: center;
}
.pk-features__fallback {
  font-size: 28px;
  color: var(--pk-accent);
  line-height: 1;
}
.pk-features__h {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.pk-features__p {
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  color: var(--pk-sub);
  font-weight: 500;
}
.pk-palette-cream {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  --pk-rule: rgba(0, 0, 0, 0.12);
}
.pk-palette-ink,
.pk-palette-auto {
  --pk-paper: #191b1e;
  --pk-ink: #ffffff;
  --pk-sub: #c5c7ca;
  --pk-accent: #c8102e;
  --pk-faint: #8a8c8f;
  --pk-rule: rgba(255, 255, 255, 0.16);
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
.pk-palette-neon {
  --pk-paper: #0a0a12;
  --pk-ink: #f5f7ff;
  --pk-sub: #b8c0d9;
  --pk-accent: #00f0ff;
  --pk-faint: #7a8299;
}
.pk-palette-sunset {
  --pk-paper: #1a0a18;
  --pk-ink: #fff5f8;
  --pk-sub: #f0c0d4;
  --pk-accent: #ff6b35;
  --pk-faint: #c48aa0;
}
.pk-palette-candy {
  --pk-paper: #fff5fb;
  --pk-ink: #1a1020;
  --pk-sub: #5a4060;
  --pk-accent: #ff2d95;
  --pk-faint: #8a7080;
}
.pk-palette-volt {
  --pk-paper: #111111;
  --pk-ink: #f5f5f5;
  --pk-sub: #c8c8c8;
  --pk-accent: #c8ff00;
  --pk-faint: #8a8a8a;
}
</style>
