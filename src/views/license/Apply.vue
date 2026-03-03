<script setup lang="ts">
import { onMounted, ref } from "vue"
import { ElMessage } from "element-plus"
import type { FormInstance } from "element-plus"
import type { LicenseModule, LicenseRequestPayload, ModuleCategory } from "@/api/license/types/license"
import {
  createLicenseRequestApi,
  createLicenseRequestMock,
  getModuleCategoriesApi,
  getModuleCategoriesMock,
  getModulesByCategoryApi,
  getModulesByCategoryMock
} from "@/api/license"
import { useUserStoreHook } from "@/store/modules/user"

const userStore = useUserStoreHook()

const dialogVisible = ref(false)
const loading = ref(false)
const moduleLoading = ref(false)
const categories = ref<ModuleCategory[]>([])
const modules = ref<LicenseModule[]>([])
const moduleCache = ref<Record<string, LicenseModule[]>>({})
const formRef = ref<FormInstance>()

const form = ref({
  customerName: "",
  macAddress: "",
  categoryId: "",
  moduleId: "",
  validDateRange: [] as string[],
  usageCount: 1
})

const rules = {
  customerName: [{ required: true, message: "请输入客户名称", trigger: "blur" }],
  macAddress: [{ required: true, message: "请输入电脑MAC地址", trigger: "blur" }],
  categoryId: [{ required: true, message: "请选择模块类别", trigger: "change" }],
  moduleId: [{ required: true, message: "请选择模块名称", trigger: "change" }],
  validDateRange: [{ type: "array", required: true, message: "请选择使用期限", trigger: "change" }],
  usageCount: [{ required: true, message: "请输入使用次数", trigger: "blur" }]
}

const fetchCategories = async () => {
  try {
    const response = await getModuleCategoriesApi()
    if (response.code === 200) {
      categories.value = response.data
      return
    }
    ElMessage.error(response.message || "加载模块类别失败")
  } catch (error) {
    const mockResponse = await getModuleCategoriesMock()
    categories.value = mockResponse.data
  }
}

const fetchModules = async (categoryId: string) => {
  if (!categoryId) {
    modules.value = []
    return
  }

  const cached = moduleCache.value[categoryId]
  if (cached) {
    modules.value = cached
    return
  }

  moduleLoading.value = true
  try {
    const response = await getModulesByCategoryApi(categoryId)
    if (response.code === 200) {
      moduleCache.value[categoryId] = response.data
      modules.value = response.data
      return
    }
    ElMessage.error(response.message || "加载模块列表失败")
  } catch (error) {
    const mockResponse = await getModulesByCategoryMock(categoryId)
    moduleCache.value[categoryId] = mockResponse.data
    modules.value = mockResponse.data
  } finally {
    moduleLoading.value = false
  }
}

const handleCategoryChange = async (categoryId: string) => {
  form.value.moduleId = ""
  await fetchModules(categoryId)
}

const resetForm = () => {
  formRef.value?.resetFields()
  modules.value = form.value.categoryId ? moduleCache.value[form.value.categoryId] || [] : []
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const [validFrom, validTo] = form.value.validDateRange
  const payload: LicenseRequestPayload = {
    customerName: form.value.customerName.trim(),
    macAddress: form.value.macAddress.trim(),
    categoryId: form.value.categoryId,
    moduleId: form.value.moduleId,
    validFrom,
    validTo,
    usageCount: form.value.usageCount
  }

  loading.value = true
  try {
    const response = await createLicenseRequestApi(payload)
    if (response.code === 200) {
      ElMessage.success("许可证申请已提交")
    } else {
      ElMessage.error(response.message || "提交申请失败")
      return
    }
  } catch (error) {
    await createLicenseRequestMock(payload, userStore.username || "current_user")
    ElMessage.success("后端不可用，已使用本地模拟数据提交")
  } finally {
    loading.value = false
  }

  dialogVisible.value = false
  resetForm()
}

onMounted(fetchCategories)
</script>

<template>
  <div class="license-request-page">
    <div class="page-header">
      <div>
        <h2 class="title">许可证申请</h2>
        <p class="subtitle">填写模块与使用期限，提交后等待管理员审批。</p>
      </div>
      <el-button type="primary" @click="dialogVisible = true">申请许可证</el-button>
    </div>

    <el-alert
      title="请确保客户信息、模块类别、模块名称和使用期限填写准确。"
      type="info"
      show-icon
      class="info-alert"
      :closable="false"
    />

    <el-dialog
      v-model="dialogVisible"
      title="申请许可证"
      width="560px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="客户名称" prop="customerName">
          <el-input v-model="form.customerName" placeholder="请输入客户名称" clearable />
        </el-form-item>
        <el-form-item label="电脑MAC地址" prop="macAddress">
          <el-input v-model="form.macAddress" placeholder="请输入电脑MAC地址" clearable />
        </el-form-item>
        <el-form-item label="模块类别" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择模块类别" @change="handleCategoryChange">
            <el-option v-for="item in categories" :key="item.categoryId" :label="item.name" :value="item.categoryId" />
          </el-select>
        </el-form-item>
        <el-form-item label="模块名称" prop="moduleId">
          <el-select
            v-model="form.moduleId"
            placeholder="请选择模块名称"
            :loading="moduleLoading"
            :disabled="!form.categoryId"
          >
            <el-option v-for="item in modules" :key="item.moduleId" :label="item.name" :value="item.moduleId" />
          </el-select>
        </el-form-item>
        <el-form-item label="使用期限" prop="validDateRange">
          <el-date-picker
            v-model="form.validDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="~"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item label="使用次数" prop="usageCount">
          <el-input-number v-model="form.usageCount" :min="1" :step="1" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.license-request-page {
  padding: 20px;
  background-color: #fff;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.title {
  margin: 0;
  font-size: 20px;
}

.subtitle {
  margin: 6px 0 0;
  color: #6b7280;
}

.info-alert {
  margin-bottom: 16px;
}
</style>
