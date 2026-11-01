<template>
  <!--
  ============================================================
  菜单注册信息（在后台菜单管理中添加以下配置）:
    菜单名称: {{ENTITY_CN}}首页
    菜单 URL: /{{MODULE_NAME}}/index
    权限标识: （可选，仪表盘本身可不用权限）
    父级菜单: 根据业务模块选择（通常作为该模块的第一个子菜单）
    排序:     建议设为 0（置顶）
  ============================================================
  页面 /{{MODULE_NAME}}/index
    → 自动匹配文件: /src/views/{{MODULE_NAME}}/Index.vue
  ============================================================
  说明:
  - 此页面作为模块首页，展示该模块下所有子实体导航卡片
  - 每个导航卡片需要各自注册对应的菜单才能跳转
  ============================================================
  -->
  <div class="module-page">
    <!-- 模块标题 -->
    <div class="module-header">
      <h2 class="module-title">{{ t('module.{{MODULE_NAME}}.title') }}</h2>
      <p class="module-desc">{{ t('module.{{MODULE_NAME}}.description') }}</p>
    </div>

    <!-- 快捷导航卡片 -->
    <el-row :gutter="20" class="module-cards">
      <el-col v-for="card in moduleCards" :key="card.key" :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
        <el-card class="module-card" :class="{ 'is-disabled': !card.hasPerm }" shadow="hover" @click="navigateTo(card)">
          <div class="card-content">
            <div class="card-icon-wrapper" :style="{ backgroundColor: card.color + '18' }">
              <el-icon :size="32" :style="{ color: card.color }">
                <component :is="card.icon" />
              </el-icon>
            </div>
            <div class="card-info">
              <h3 class="card-title">{{ card.title }}</h3>
              <p class="card-desc">{{ card.description }}</p>
            </div>
          </div>
          <div v-if="card.count !== undefined" class="card-badge">
            <el-tag :type="card.count > 0 ? 'primary' : 'info'" size="small" round>
              {{ card.count }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 统计概览（可选） -->
    <!--
    <el-card class="module-stats" shadow="never">
      <template #header>
        <span>{{ t('module.{{MODULE_NAME}}.overview') }}</span>
      </template>
      <el-row :gutter="20">
        <el-col v-for="stat in statistics" :key="stat.key" :span="6">
          <div class="stat-item">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>
    -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import {
  List,
  Setting,
  Document,
  FolderOpened,
  Tickets,
  User,
  ShoppingCart,
  Goods,
  Coin,
  TrendCharts,
  DataAnalysis,
  Collection,
  Grid,
  Reading,
  Memo,
  Papers,
  Files,
  CopyDocument,
  Notebook,
  EditPen,
  Key,
  Lock,
  Shield,
  Bell,
  ChatDotSquare,
  Histogram,
  PieChart,
  DataBoard,
  Calendar,
  Timer,
  Upload,
  Download,
  Plus,
  Search,
  View,
  Edit,
  Delete,
  Share,
  Link,
  Message,
  Warning,
  InfoFilled,
  SuccessFilled,
  CircleCheck,
  CirclePlus,
  Remove,
  ZoomOut,
  ZoomIn,
  Sort,
  Filter,
  Refresh,
  MoreFilled,
} from '@element-plus/icons-vue'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()

// ==================== 模块卡片配置 ====================
// TODO: 按照实际业务模块修改以下配置
interface ModuleCard {
  key: string
  title: string
  description: string
  icon: Component
  route: string
  permission?: string
  color: string
  count?: number
}

const moduleCards = computed<ModuleCard[]>(() =>
  [
    {
      key: '{{ENTITY_NAME}}-1',
      title: t('module.{{MODULE_NAME}}.entity1'),
      description: t('module.{{MODULE_NAME}}.entity1Desc'),
      icon: Document,
      route: '/{{MODULE_NAME}}/entity1',
      permission: '{{PERMISSION_MODULE}}Entity1.list',
      color: '#409eff',
    },
    {
      key: '{{ENTITY_NAME}}-2',
      title: t('module.{{MODULE_NAME}}.entity2'),
      description: t('module.{{MODULE_NAME}}.entity2Desc'),
      icon: FolderOpened,
      route: '/{{MODULE_NAME}}/entity2',
      permission: '{{PERMISSION_MODULE}}Entity2.list',
      color: '#67c23a',
    },
    {
      key: '{{ENTITY_NAME}}-3',
      title: t('module.{{MODULE_NAME}}.entity3'),
      description: t('module.{{MODULE_NAME}}.entity3Desc'),
      icon: Tickets,
      route: '/{{MODULE_NAME}}/entity3',
      permission: '{{PERMISSION_MODULE}}Entity3.list',
      color: '#e6a23c',
    },
    {
      key: '{{ENTITY_NAME}}-4',
      title: t('module.{{MODULE_NAME}}.entity4'),
      description: t('module.{{MODULE_NAME}}.entity4Desc'),
      icon: Setting,
      route: '/{{MODULE_NAME}}/entity4',
      permission: '{{PERMISSION_MODULE}}Entity4.list',
      color: '#f56c6c',
    },
  ].map((card) => ({
    ...card,
    hasPerm: card.permission ? userStore.hasPerm(card.permission) : true,
  }))
)

// ==================== 统计概览（可选） ====================
/*
const statistics = computed(() => [
  { key: 'total', label: t('module.{{MODULE_NAME}}.statTotal'), value: 128 },
  { key: 'active', label: t('module.{{MODULE_NAME}}.statActive'), value: 96 },
  { key: 'pending', label: t('module.{{MODULE_NAME}}.statPending'), value: 12 },
  { key: 'disabled', label: t('module.{{MODULE_NAME}}.statDisabled'), value: 20 },
])
*/

// ==================== 导航 ====================
function navigateTo(card: ModuleCard) {
  if (!card.hasPerm) {
    return
  }
  router.push(card.route)
}
</script>

<style scoped>
.module-page {
  padding: 0;
}

.module-header {
  margin-bottom: 24px;
}

.module-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.module-desc {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.module-cards {
  margin-bottom: 24px;
}

.module-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  border-radius: 8px;
  position: relative;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.module-card.is-disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.module-card.is-disabled:hover {
  transform: none;
  box-shadow: none;
}

.card-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.card-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-badge {
  position: absolute;
  top: 12px;
  right: 12px;
}

.module-stats {
  border-radius: 8px;
}

.stat-item {
  text-align: center;
  padding: 16px 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
</style>
