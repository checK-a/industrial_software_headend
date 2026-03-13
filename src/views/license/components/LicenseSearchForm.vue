<script setup lang="ts">
import { reactive, watch, withDefaults } from "vue"
import { ElButton, ElForm, ElFormItem, ElInput, ElOption, ElSelect } from "element-plus"
import type { LicenseRequestSearchQuery, LicenseRequestStatus, ModuleCategory } from "@/api/license/types/license"
import { LICENSE_REQUEST_STATUS_OPTIONS } from "@/constants/license"

const props = withDefaults(
  defineProps<{
    modelValue: LicenseRequestSearchQuery
    categories: ModuleCategory[]
    loading: boolean
    showModuleKeyword?: boolean
    showCategory?: boolean
    showStatus?: boolean
    statusOptions?: Array<{ label: string; value: LicenseRequestStatus }>
    statusLabel?: string
  }>(),
  {
    showModuleKeyword: true,
    showCategory: true,
    showStatus: true,
    statusOptions: () => [...LICENSE_REQUEST_STATUS_OPTIONS],
    statusLabel: "申请状态"
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", value: LicenseRequestSearchQuery): void
  (e: "search"): void
  (e: "reset"): void
}>()

const localQuery = reactive<LicenseRequestSearchQuery>({
  pageNum: props.modelValue.pageNum,
  pageSize: props.modelValue.pageSize,
  moduleKeyword: props.modelValue.moduleKeyword ?? "",
  categoryId: props.modelValue.categoryId ?? "",
  status: props.modelValue.status ?? ""
})

watch(
  () => props.modelValue,
  (value) => {
    localQuery.pageNum = value.pageNum
    localQuery.pageSize = value.pageSize
    localQuery.moduleKeyword = value.moduleKeyword ?? ""
    localQuery.categoryId = value.categoryId ?? ""
    localQuery.status = value.status ?? ""
  },
  { deep: true }
)

watch(
  localQuery,
  () => {
    emit("update:modelValue", {
      pageNum: localQuery.pageNum,
      pageSize: localQuery.pageSize,
      moduleKeyword: localQuery.moduleKeyword || undefined,
      categoryId: localQuery.categoryId || undefined,
      status: localQuery.status || undefined
    })
  },
  { deep: true }
)

const handleReset = () => {
  localQuery.moduleKeyword = ""
  localQuery.categoryId = ""
  localQuery.status = ""
  emit("reset")
}
</script>

<template>
  <el-form class="search-form" inline label-width="95px">
    <el-form-item v-if="props.showModuleKeyword" label="模块关键字">
      <el-input v-model="localQuery.moduleKeyword" placeholder="请输入模块 ID 或模块名称" clearable />
    </el-form-item>

    <el-form-item v-if="props.showCategory" label="模块类别">
      <el-select v-model="localQuery.categoryId" placeholder="请选择模块类别" clearable style="width: 180px">
        <el-option
          v-for="item in props.categories"
          :key="item.categoryId"
          :label="item.name"
          :value="item.categoryId"
        />
      </el-select>
    </el-form-item>

    <el-form-item v-if="props.showStatus" :label="props.statusLabel">
      <el-select v-model="localQuery.status" placeholder="请选择状态" clearable style="width: 180px">
        <el-option v-for="item in props.statusOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" :loading="props.loading" @click="emit('search')">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped lang="scss">
.search-form {
  width: 100%;
  margin-bottom: 16px;
}
</style>
