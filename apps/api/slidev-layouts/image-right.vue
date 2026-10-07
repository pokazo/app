<script setup lang="ts">
const props = defineProps<{
  palette?: string

  image?: string
  kicker?: string
}>()

function photoSrc(image?: string) {
  if (!image) return ""
  const base = import.meta.env.BASE_URL || "/"
  const path = image.startsWith("/") ? image.slice(1) : image
  return `${base}${path}`
}

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"
</script>

<template>
  <div class="pk-split" :class="paletteClass">
    <div class="pk-split__pane">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-split__body">
        <slot />
      </div>
    </div>
    <div class="pk-split__photo">
      <img v-if="props.image" :src="photoSrc(props.image)" alt="" />
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
  padding: 48px 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
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
}
.pk-split__body :deep(h1),
.pk-split__body :deep(h2),
.pk-split__body :deep(p),
.pk-split__body :deep(li) {
  color: var(--pk-ink, #161616);
  opacity: 1;
}
.pk-split__body :deep(h1) {
  margin: 0 0 16px;
  font-size: 36px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.pk-split__body :deep(p),
.pk-split__body :deep(li) {
  font-size: 18px;
  line-height: 1.45;
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
</style>
