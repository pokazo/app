<script setup lang="ts">
defineProps<{
  kicker?: string
  source?: string
  brand?: string
}>()
</script>

<template>
  <div class="pk-brick pk-hero">
    <div class="pk-brick__grid" />
    <div class="pk-brick__frame" />
    <div class="pk-brick__inner">
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
  display: none;
}
.pk-brick__frame {
  display: none;
}
.pk-brick__inner {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 48px 72px 48px;
  display: flex;
  flex-direction: column;
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
.pk-hero__body :deep(h1) {
  margin: 0 0 24px;
  font-size: 56px;
  line-height: 1.05;
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
</style>
