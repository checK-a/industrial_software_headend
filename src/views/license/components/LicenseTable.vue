<script setup lang="ts">
import { ElButton, ElTable, ElTableColumn, ElTag } from "element-plus"
import type { LicenseRequestItem } from "@/api/license/types/license"
import { LICENSE_REQUEST_STATUS_LABELS, LICENSE_REQUEST_STATUS_TYPES } from "@/constants/license"

const props = defineProps<{
  items: LicenseRequestItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: "view", requestId: string): void
}>()
</script>

<template>
  <el-table
    :data="props.items"
    :style="{ width: '100%' }"
    v-loading="props.loading"
    row-key="requestId"
    empty-text="暂无数据"
  >
    <el-table-column prop="licenseNo" label="许可证编号" min-width="160">
      <template #default="{ row }">{{ row.licenseNo || "-" }}</template>
    </el-table-column>
    <el-table-column prop="userName" label="用户" min-width="120" />
    <el-table-column prop="categoryName" label="模块类别" min-width="120" />
    <el-table-column prop="moduleName" label="模块名称" min-width="140" />
    <el-table-column label="使用期限" min-width="200">
      <template #default="{ row }">{{ row.validFrom }} ~ {{ row.validTo }}</template>
    </el-table-column>
    <el-table-column prop="usageCount" label="使用次数" width="110" />
    <el-table-column label="状态" width="150">
      <template #default="{ row }">
        <el-tag :type="LICENSE_REQUEST_STATUS_TYPES[row.status]">
          {{ LICENSE_REQUEST_STATUS_LABELS[row.status] }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="createdAt" label="申请时间" min-width="120" />
    <el-table-column label="操作" width="120">
      <template #default="{ row }">
        <el-button size="small" @click="emit('view', row.requestId)">查看</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
