<script setup lang="ts">
import { computed } from 'vue'
import { icons as carbonIcons } from '@iconify-json/carbon'
import { assertFeaturesLayout } from './layout-assert.js'

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

function renderCarbon(name: string, heightPx: string) {
  const icon = carbonIcons.icons?.[name]
  if (!icon?.body) return null
  const w = icon.width ?? carbonIcons.width ?? 32
  const h = icon.height ?? carbonIcons.height ?? 32
  return {
    attributes: {
      width: heightPx,
      height: heightPx,
      viewBox: `0 0 ${w} ${h}`,
      xmlns: "http://www.w3.org/2000/svg",
      fill: "currentColor",
    },
    body: icon.body,
  }
}

const items = computed(() =>
  (props.items?.length ? props.items : props.features ?? [])
    .filter((it) => it.title?.trim() && it.iconHint?.trim())
    .slice(0, 3)
    .map((it) => {
      const hint = (it.iconHint ?? "").trim()
      const m = hint.match(/^carbon-(.+)$/i)
      const svg = m?.[1] ? renderCarbon(m[1], "40px") : null
      return {
        title: it.title ?? "",
        body: it.body ?? "",
        svg,
      }
    }),
)

const paletteClass =
  props.palette === "ink" || props.palette === "auto" ? `pk-palette-${props.palette}` : "pk-palette-cream"
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
</style>
