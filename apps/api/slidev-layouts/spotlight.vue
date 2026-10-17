<script setup lang="ts">
import { computed } from 'vue'
import {
  assertSpotlightLayout,
  SPOTLIGHT_CONTENT_LIMITS,
} from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

export type SpotlightItem = {
  title?: string
  body?: string
}

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
  image?: string
  items?: SpotlightItem[]
  /** Alias if model emits cards: */
  cards?: SpotlightItem[]
}>()

assertSpotlightLayout(props)

const items = computed(() =>
  (props.items?.length ? props.items : props.cards ?? [])
    .filter((it) => it.title?.trim() && it.body?.trim())
    .slice(0, SPOTLIGHT_CONTENT_LIMITS.pairCount)
    .map((it) => ({
      title: (it.title ?? "").trim().slice(0, SPOTLIGHT_CONTENT_LIMITS.maxPairTitleChars),
      body: (it.body ?? "").trim().slice(0, SPOTLIGHT_CONTENT_LIMITS.maxPairBodyChars),
    })),
)

const left = computed(() => items.value.slice(0, 2))
const right = computed(() => items.value.slice(2, 4))

function photoSrc(image?: string) {
  if (!image) return ""
  const base = import.meta.env.BASE_URL || "/"
  const path = image.startsWith("/") ? image.slice(1) : image
  return `${base}${path}`
}

const paletteClass = resolvePaletteClass(props.palette)
</script>

<template>
  <div class="pk-brick pk-spotlight" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-head">
        <div class="pk-kicker" v-if="kicker">
          <span class="pk-kicker__line" />
          <span class="pk-kicker__text">{{ kicker }}</span>
        </div>
        <div class="pk-title">
          <slot />
        </div>
      </div>
      <div class="pk-stage">
        <div class="pk-edge pk-edge--left">
          <div v-for="(it, i) in left" :key="'L' + i" class="pk-pair">
            <div class="pk-pair__title">{{ it.title }}</div>
            <div class="pk-pair__body">{{ it.body }}</div>
          </div>
        </div>
        <div class="pk-hero-wrap">
          <div class="pk-hero-img">
            <img v-if="props.image" :src="photoSrc(props.image)" alt="" />
          </div>
        </div>
        <div class="pk-edge pk-edge--right">
          <div v-for="(it, i) in right" :key="'R' + i" class="pk-pair">
            <div class="pk-pair__title">{{ it.title }}</div>
            <div class="pk-pair__body">{{ it.body }}</div>
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
  padding: 44px 64px 40px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0;
}
.pk-head {
  flex: none;
  max-width: 52ch;
  margin-bottom: 28px;
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
  margin: 0 0 8px;
  font-size: 42px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.035em;
  max-width: 22ch;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.pk-title :deep(p) {
  margin: 0;
  font-size: 19px;
  line-height: 1.4;
  color: var(--pk-sub);
  font-weight: 500;
  max-width: 48ch;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.pk-title :deep(ul),
.pk-title :deep(ol) {
  display: none;
}
.pk-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr) 200px;
  column-gap: 16px;
  align-items: center;
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}
.pk-edge {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: 40px;
  height: 100%;
  max-height: 520px;
  min-width: 0;
}
.pk-edge--right {
  text-align: right;
}
.pk-edge--right .pk-pair__body {
  margin-left: auto;
}
.pk-hero-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  height: 100%;
}
.pk-hero-img {
  width: 100%;
  aspect-ratio: 16 / 10;
  max-height: min(520px, 100%);
  border-radius: 20px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}
.pk-hero-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pk-pair__title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin-bottom: 8px;
  overflow: hidden;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.pk-pair__body {
  font-size: 15px;
  line-height: 1.4;
  color: var(--pk-sub);
  font-weight: 500;
  max-width: 16ch;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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
