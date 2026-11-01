<template>
    <div class="row-actions">
        <!-- visible actions -->
        <template v-for="act in visibleActions" :key="act.label">
            <template v-if="act.popconfirm">
                <el-popconfirm :title="act.popconfirm" @confirm="act.onClick?.()">
                    <template #reference>
                        <template v-if="!shouldShowLabel(act)">
                            <span class="action-wrap">
                                <el-tooltip :content="act.label" placement="top">
                                    <el-button :link="act.link ?? true" :type="act.type ?? 'info'"
                                        v-has="act.permission" :size="act.size ?? 'small'" @click="act.onClick?.()"
                                        :class="['row-action--icon-only', act.className]"
                                        :style="act.iconColor ? { color: act.iconColor } : undefined">
                                        <template #icon>
                                            <template v-if="typeof act.icon === 'string'">
                                                <img :src="act.icon as string" class="row-action-img" />
                                            </template>
                                            <template v-else>
                                                <component :is="act.icon as Component" />
                                            </template>
                                        </template>
                                    </el-button>
                                </el-tooltip>
                            </span>
                        </template>
                        <template v-else>
                            <span class="action-wrap action-wrap--text">
                                <el-button :link="act.link ?? true" :type="act.type ?? 'info'" v-has="act.permission"
                                    :size="act.size ?? 'small'" @click="act.onClick?.()" :class="act.className"
                                    :style="act.iconColor ? { color: act.iconColor } : undefined">
                                    <template #icon>
                                        <template v-if="typeof act.icon === 'string'">
                                            <img :src="act.icon as string" class="row-action-img" />
                                        </template>
                                        <template v-else>
                                            <component :is="act.icon as Component" />
                                        </template>
                                    </template>
                                    {{ act.label }}
                                </el-button>
                            </span>
                        </template>
                    </template>
                </el-popconfirm>
            </template>

            <template v-else>
                <template v-if="!shouldShowLabel(act)">
                    <span class="action-wrap">
                        <el-tooltip :content="act.label" placement="top">
                            <el-button :link="act.link ?? true" :type="act.type ?? 'info'" v-has="act.permission"
                                :size="act.size ?? 'small'" @click="act.onClick?.()"
                                :class="['row-action--icon-only', act.className]">
                                <template #icon>
                                    <template v-if="typeof act.icon === 'string'">
                                        <img :src="act.icon as string" class="row-action-img" />
                                    </template>
                                    <template v-else>
                                        <component :is="act.icon as Component" />
                                    </template>
                                </template>
                            </el-button>
                        </el-tooltip>
                    </span>
                </template>
                <template v-else>
                    <span class="action-wrap action-wrap--text">
                        <!-- <el-button :link="act.link ?? true" :type="act.type ?? 'info'" :icon="act.icon"
                            v-has="act.permission" :size="act.size ?? 'small'" @click="act.onClick?.()"
                            :class="act.className">
                            {{ act.label }}
                        </el-button> -->
                    </span>
                </template>
            </template>
        </template>

        <!-- collapsed actions in dropdown -->
        <el-dropdown v-if="collapsedActions.length > 0" trigger="click" @command="onCommand">
            <el-button link type="info" :size="size" class="row-actions__more row-action-duplicate">
                <span class="row-actions__more-dot" />
            </el-button>
            <template #dropdown>
                <el-dropdown-menu>
                    <template v-for="act in collapsedActions" :key="act.label">
                        <el-dropdown-item v-if="!act.divider" :command="act" :divided="act.divided">
                            <template v-if="typeof act.icon === 'string'">
                                <img :src="act.icon as string" class="row-action-img"
                                    style="margin-right:8px; width:16px; height:16px; object-fit:contain" />
                            </template>
                            <template v-else>
                                <el-icon style="margin-right:8px">
                                    <component :is="act.icon as Component" />
                                </el-icon>
                            </template>
                            {{ act.label }}
                        </el-dropdown-item>
                        <el-dropdown-item v-else disabled>────────</el-dropdown-item>
                    </template>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

export interface RowAction {
    label: string
    onClick?: () => void
    type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
    icon?: string | Component
    permission?: string
    className?: string
    iconColor?: string
    display?: 'icon' | 'text'
    popconfirm?: string
    link?: boolean
    size?: 'small' | 'default' | 'large'
    collapsed?: boolean
    divided?: boolean
    divider?: boolean
}

const props = withDefaults(
    defineProps<{
        actions: RowAction[]
        maxVisible?: number
        size?: 'small' | 'default' | 'large'
    }>(),
    {
        maxVisible: 1,
        size: 'small',
    }
)

const dedupedActions = computed(() => {
    const arr = props.actions || []
    const seen = new Map<string, RowAction>()
    for (let i = arr.length - 1; i >= 0; i--) {
        const a = arr[i]
        if (!seen.has(a.label)) seen.set(a.label, a)
    }
    return arr.filter((a) => seen.get(a.label) === a)
})

const visibleActions = computed(() => dedupedActions.value.filter((a) => !a.collapsed).slice(0, props.maxVisible))
const collapsedActions = computed(() => {
    const remaining = dedupedActions.value.filter((a) => !a.collapsed).slice(props.maxVisible)
    return [...remaining, ...dedupedActions.value.filter((a) => a.collapsed)]
})

function onCommand(act: RowAction) {
    act.onClick?.()
}

function shouldShowLabel(act: RowAction) {
    if (act.display === 'text') return true
    if (act.display === 'icon') return false
    return !act.icon
}
</script>

<style scoped>
.row-actions {
    display: inline-flex;
    align-items: center;
    gap: 16px;
    padding: 2px 0;
    white-space: nowrap;
}

.row-actions__more {
    border: none;
    width: 24px;
    height: 24px;
    padding: 0 !important;
    min-width: 24px !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}

.row-actions__more-dot {
    display: inline-block;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #999;
    box-shadow: -5px 0 0 #999, 5px 0 0 #999;
}

.row-action--icon-only {
    padding: 0 !important;
    width: 24px;
    height: 24px;
    min-width: 24px !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.15s ease;
    color: #000 !important;
    /* light gray background for icon-only row buttons */
    background-color: var(--row-action-bg, #f5f5f5);
}

.row-action--icon-only:hover {
    background-color: var(--next-bg-menuBarActiveColor, rgba(105, 84, 240, 0.08)) !important;
    color: var(--el-color-primary) !important;
}

.row-action-img {
    width: 16px;
    height: 16px;
    object-fit: contain;
    display: block
}

/* on hover, slightly darken the icon color and lift the icon for a subtle effect */
.row-action--icon-only:hover .el-icon {
    transition: filter 0.12s ease, transform 0.12s ease, color 0.12s ease;
    filter: brightness(0.85);
    transform: translateY(-1px);
}

.row-actions {
    padding: 2px 0;
    border-radius: 6px;
}

.row-actions .el-button {
    background: var(--row-action-bg, transparent);
    border-radius: 4px;
    color: #000 !important;
}

.row-actions .el-button:hover {
    background-color: var(--next-bg-menuBarActiveColor, rgba(105, 84, 240, 0.08)) !important;
}

.row-action-duplicate {
    background-color: #f5f5f5 !important;
}

.row-action-duplicate.row-action--icon-only {
    background-color: #f5f5f5 !important;
    padding: 0 !important;
    width: 24px;
    height: 24px;
    min-width: 24px !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.row-actions__more.row-action-duplicate {
    background-color: #f5f5f5 !important;
}

.row-actions>* {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.row-actions>*>.el-button {
    margin: 0 !important;
    box-sizing: border-box;
    padding: 0 !important;
    min-width: 0 !important;
    line-height: 1 !important;
}

.row-actions .el-tooltip,
.row-actions .el-popconfirm__reference,
.row-actions .el-dropdown {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

/* wrappers for actions */
.action-wrap {
    width: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.action-wrap--text {
    width: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

/* center text buttons (编辑/删除) inside action wrapper */
.action-wrap--text .el-button {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 8px !important;
    min-width: 56px !important;
    height: 28px !important;
    box-sizing: border-box;
}

/* ensure inner text is centered */
.action-wrap--text .el-button .el-button__inner {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100%;
}

/* tighten tooltip/popover content padding (applies to body-mounted poppers) */
::v-deep .el-tooltip__popper .el-tooltip__content {
    padding: 0px 4px !important;
    white-space: nowrap;
    max-width: none;
    font-size: 11px;
}

::v-deep .el-popover__content {
    padding: 0px 4px !important;
    font-size: 11px;
}

/* Make SVG icons inherit button color and apply colored backgrounds for typed icon-only buttons */
.row-actions .el-button .el-icon {
    color: var(--row-action-icon-color, inherit);
    display: inline-flex;
}

.row-actions .el-button .el-icon svg {
    fill: currentColor !important;
    stroke: currentColor !important;
}


.row-actions .row-action--icon-only.el-button--primary .el-icon {
    color: var(--el-color-primary) !important;
}

.row-actions .row-action--icon-only.el-button--success .el-icon {
    color: var(--el-color-success) !important;
}

.row-actions .row-action--icon-only.el-button--warning .el-icon {
    color: var(--el-color-warning) !important;
}

.row-actions .row-action--icon-only.el-button--danger .el-icon {
    color: var(--el-color-danger) !important;
}

.row-actions .row-action--icon-only.el-button--info .el-icon {
    color: var(--el-color-info, #909399) !important;
}

/* center dropdown item content (collapsed actions) — target teleported menu */
::v-deep .el-dropdown-menu {
    padding: 4px 0 !important;
}

::v-deep .el-dropdown-menu .el-dropdown-item,
::v-deep .el-dropdown-menu__item {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    padding: 6px 16px !important;
    box-sizing: border-box !important;
    text-align: center !important;
}

::v-deep .el-dropdown-menu .el-dropdown-item img,
::v-deep .el-dropdown-menu .el-dropdown-item .el-icon,
::v-deep .el-dropdown-menu__item img,
::v-deep .el-dropdown-menu__item .el-icon {
    margin-right: 0 !important;
}
</style>