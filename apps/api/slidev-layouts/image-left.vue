<script setup lang="ts">
import { assertImageLayout } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

const props = defineProps<{
  palette?: string

  image?: string
  kicker?: string
}>()

assertImageLayout('image-left', props)

function photoSrc(image?: string) {
  if (!image) return ""
  const base = import.meta.env.BASE_URL || "/"
  const path = image.startsWith("/") ? image.slice(1) : image
  return `${base}${path}`
}

const paletteClass = resolvePaletteClass(props.palette)
</script>

<template>
  <div class="pk-split" :class="paletteClass">
    <div class="pk-split__photo">
      <img v-if="props.image" :src="photoSrc(props.image)" alt="" />
    </div>
    <div class="pk-split__pane">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-split__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pk-split {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  background: var(--pk-paper, #f7f3ec);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.pk-split__pane {
  background: var(--pk-paper, #f7f3ec);
  color: var(--pk-ink, #161616);
  padding: 40px 40px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  min-width: 0;
  flex: none;
}
.pk-kicker__line {
  width: 36px;
  height: 3px;
  background: #c45c26;
  border-radius: 2px;
  flex: none;
}
.pk-kicker__text {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #c45c26;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pk-split__body {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  flex: 1 1 auto;
}
.pk-split__body :deep(h1),
.pk-split__body :deep(h2),
.pk-split__body :deep(p),
.pk-split__body :deep(li) {
  color: var(--pk-ink, #161616);
  opacity: 1;
}
.pk-split__body :deep(h1) {
  margin: 0 0 14px;
  font-size: 32px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.pk-split__body :deep(p),
.pk-split__body :deep(li) {
  font-size: 16px;
  line-height: 1.4;
}
.pk-split__body :deep(ul) {
  margin: 0;
  padding-left: 1.1em;
}
.pk-split__photo {
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a1a;
}
.pk-split__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.pk-palette-frost {
  --pk-paper: #f0f5f8;
  --pk-ink: #152633;
  --pk-sub: #3d5260;
  --pk-accent: #4a7c9b;
  --pk-faint: #6b8290;
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
