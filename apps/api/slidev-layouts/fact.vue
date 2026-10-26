<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { assertFactLayout, factClaimTier } from './layout-assert.js'
import { paletteClass as resolvePaletteClass } from './palette-class.js'

const props = defineProps<{
  palette?: string
  kicker?: string
  source?: string
}>()

const slots = useSlots()
assertFactLayout({ hasBodySlot: Boolean(slots.default) })

const paletteClass = resolvePaletteClass(props.palette)

function vnodeText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(vnodeText).join('')
  if (typeof node === 'object' && 'children' in node) {
    return vnodeText((node as { children?: unknown }).children)
  }
  return ''
}

function headingText(nodes: unknown): string {
  const list = Array.isArray(nodes) ? nodes : nodes ? [nodes] : []
  for (const n of list) {
    if (!n || typeof n !== 'object') continue
    const vnode = n as { type?: unknown; children?: unknown }
    if (vnode.type === 'h1') return vnodeText(vnode.children).replace(/\s+/g, ' ').trim()
    const nested = headingText(vnode.children)
    if (nested) return nested
  }
  return ''
}

const claimTier = computed(() => factClaimTier(headingText(slots.default?.())))
</script>

<template>
  <div class="pk-brick pk-fact" :class="paletteClass">
    <div class="pk-brick__grid" />
    <div class="pk-brick__inner">
      <div class="pk-kicker" v-if="kicker">
        <span class="pk-kicker__line" />
        <span class="pk-kicker__text">{{ kicker }}</span>
      </div>
      <div class="pk-fact__body" :class="`is-${claimTier}`">
        <slot />
        <p v-if="source" class="pk-fact__src">{{ source }}</p>
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
.pk-fact__body {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.75fr);
  column-gap: 48px;
  row-gap: 16px;
  align-content: center;
  align-items: center;
  position: relative;
}
.pk-fact__body::after {
  content: "";
  position: absolute;
  top: 18%;
  bottom: 18%;
  left: calc(1.15 / 1.9 * (100% - 48px) + 24px);
  width: 1px;
  background: var(--pk-rule);
  pointer-events: none;
}
.pk-fact__body :deep(h1) {
  grid-column: 1;
  grid-row: 1 / span 8;
  margin: 0;
  font-size: 84px;
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.045em;
  max-width: 9ch;
  align-self: center;
}
/* Slide canvas is ~980px, so the left column is ~480px. 40px keeps a
   sentence on two lines ("От аристократии — к" / "глобальному институту").
   9ch at 84px stacks every word and parks "— к" alone. */
.pk-fact__body.is-long :deep(h1) {
  font-size: 40px;
  line-height: 1.08;
  letter-spacing: -0.03em;
  width: 100%;
  max-width: 100%;
  text-wrap: balance;
}
.pk-fact__body :deep(h1 ~ p),
.pk-fact__body :deep(h1 ~ ul) {
  grid-column: 2;
  margin: 0;
  padding: 0 0 0 8px;
  list-style: none;
  font-size: 22px;
  line-height: 1.4;
  color: var(--pk-sub);
  font-weight: 500;
  max-width: 22ch;
}
.pk-fact__body :deep(h1 ~ ul) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pk-fact__body :deep(li) {
  margin: 0;
  font-size: 22px;
  line-height: 1.4;
  color: var(--pk-sub);
  font-weight: 500;
}
.pk-fact__src {
  grid-column: 2;
  margin: 0;
  padding: 0 0 0 8px;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pk-faint);
  font-weight: 600;
  max-width: 22ch;
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
  --pk-rule: rgba(255, 255, 255, 0.18);
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
