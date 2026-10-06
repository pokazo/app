<script setup lang="ts">
const props = defineProps<{
  kicker?: string
  source?: string
  brand?: string
  image?: string
}>()

function photoSrc(image?: string) {
  if (!image) return ""
  const base = import.meta.env.BASE_URL || "/"
  const path = image.startsWith("/") ? image.slice(1) : image
  return `${base}${path}`
}
</script>

<template>
  <div class="pk-brick pk-hero" :class="{ 'pk-hero--photo': Boolean(props.image) }">
    <div class="pk-brick__pane">
      <div class="pk-brand" v-if="brand">
        <span class="pk-brand__mark" />
        <span class="pk-brand__text">{{ brand }}</span>
      </div>
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-hero__body">
        <slot />
      </div>
      <div v-if="source" class="pk-source">{{ source }}</div>
    </div>
    <div v-if="props.image" class="pk-hero__photo">
      <img :src="photoSrc(props.image)" alt="" />
    </div>
  </div>
</template>

<style scoped>
.pk-brick {
  --pk-paper: #f7f3ec;
  --pk-ink: #161616;
  --pk-sub: #3d3d3d;
  --pk-accent: #c45c26;
  --pk-faint: #6b6b6b;
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--pk-paper);
  color: var(--pk-ink);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.pk-hero--photo {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
}
.pk-brick__pane {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  background: var(--pk-paper);
  color: var(--pk-ink);
}
.pk-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: auto;
}
.pk-brand__mark {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: var(--pk-accent);
  flex: none;
}
.pk-brand__text {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.pk-kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.pk-kicker__line {
  width: 36px;
  height: 3px;
  background: var(--pk-accent);
  border-radius: 2px;
  flex: none;
}
.pk-kicker__text {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--pk-accent);
}
.pk-hero__body {
  margin-top: auto;
  margin-bottom: auto;
}
.pk-hero__body :deep(h1),
.pk-hero__body :deep(p),
.pk-hero__body :deep(li) {
  color: var(--pk-ink);
  opacity: 1;
}
.pk-hero__body :deep(h1) {
  margin: 0 0 24px;
  font-size: 48px;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.03em;
  max-width: 16ch;
}
.pk-hero__body :deep(ul) {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.pk-hero__body :deep(li) {
  font-size: 20px;
  line-height: 1.45;
  color: var(--pk-sub);
  margin: 0 0 8px;
}
.pk-source {
  font-size: 13px;
  color: var(--pk-faint);
  font-family: ui-monospace, monospace;
}
.pk-hero__photo {
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a1a;
}
.pk-hero__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
