<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { ElMessage } from "element-plus"
import type { LicenseRequestItem } from "@/api/license/types/license"
import {
  downloadLicenseFileApi,
  downloadLicenseFileMock,
  fillRequestDisplayNames,
  getLicenseRequestsApi,
  getLicenseRequestsByUserIdApi,
  getLicenseRequestsMock,
  getModuleCategoriesApi,
  getModuleCategoriesMock,
  getModulesByCategoryApi,
  getModulesByCategoryMock
} from "@/api/license"
import {
  LICENSE_REQUEST_STATUS_LABELS,
  LICENSE_REQUEST_STATUS_TYPES,
  isAllocatedLicenseStatus
} from "@/constants/license"
import { useUserStoreHook } from "@/store/modules/user"

const TEXT = {
  title: "\u8bb8\u53ef\u8bc1\u4e0b\u8f7d",
  subtitle:
    "\u67e5\u770b\u5f53\u524d\u7528\u6237\u7684\u8bb8\u53ef\u8bc1\u7533\u8bf7\u8bb0\u5f55\uff0c\u5df2\u5ba1\u6279\u7684\u8bb0\u5f55\u53ef\u4ee5\u76f4\u63a5\u4e0b\u8f7d\u8bc1\u4e66\u6587\u4ef6\u3002",
  requestId: "\u7533\u8bf7\u7f16\u53f7",
  categoryName: "\u6a21\u5757\u7c7b\u522b",
  moduleName: "\u6a21\u5757\u540d\u79f0",
  validPeriod: "\u4f7f\u7528\u671f\u9650",
  usageCount: "\u4f7f\u7528\u6b21\u6570",
  status: "\u72b6\u6001",
  licenseNo: "\u8bb8\u53ef\u8bc1\u7f16\u53f7",
  createdAt: "\u7533\u8bf7\u65f6\u95f4",
  action: "\u64cd\u4f5c",
  download: "\u4e0b\u8f7d",
  missingUserId:
    "\u5f53\u524d\u767b\u5f55\u6001\u7f3a\u5c11 userId\uff0c\u5df2\u4e34\u65f6\u6309\u7528\u6237\u540d\u8fc7\u6ee4\u7533\u8bf7\u8bb0\u5f55\u3002\u5efa\u8bae\u91cd\u65b0\u767b\u5f55\u540e\u91cd\u8bd5\u3002",
  loadFailed:
    "\u52a0\u8f7d\u8bb8\u53ef\u8bc1\u7533\u8bf7\u8bb0\u5f55\u5931\u8d25\uff0c\u5df2\u5207\u6362\u5230\u672c\u5730\u6a21\u62df\u6570\u636e\u3002",
  downloadFailed: "\u4e0b\u8f7d\u5931\u8d25"
}

const userStore = useUserStoreHook()

const loading = ref(false)
const errorMessage = ref("")
const requests = ref<LicenseRequestItem[]>([])
const total = ref(0)
const query = ref({
  pageNum: 1,
  pageSize: 10
})

const isAdmin = computed(() => userStore.roles.includes("admin"))
const currentUser = computed(() => userStore.username || "")
const currentUserId = computed(() => (typeof userStore.userId === "number" ? userStore.userId : null))

const getDownloadStartedMessage = (label: string) => `\u5df2\u5f00\u59cb\u4e0b\u8f7d\u8bb8\u53ef\u8bc1\uff1a${label}`

const loadCatalog = async () => {
  let categories: { categoryId: string }[] = []
  try {
    const response = await getModuleCategoriesApi()
    categories = response.data
  } catch {
    const mockResponse = await getModuleCategoriesMock()
    categories = mockResponse.data
  }

  await Promise.all(
    categories.map(async (item) => {
      try {
        await getModulesByCategoryApi(item.categoryId)
      } catch {
        await getModulesByCategoryMock(item.categoryId)
      }
    })
  )
}

const applyUserFilterAndPage = (rows: LicenseRequestItem[]) => {
  const filteredRows = isAdmin.value
    ? rows
    : currentUser.value
    ? rows.filter((item) => item.userName === currentUser.value)
    : []

  total.value = filteredRows.length
  const start = (query.value.pageNum - 1) * query.value.pageSize
  const end = start + query.value.pageSize
  requests.value = filteredRows.slice(start, end)
}

const fetchRequests = async () => {
  loading.value = true
  errorMessage.value = ""
  try {
    if (isAdmin.value) {
      const response = await getLicenseRequestsApi({
        page: query.value.pageNum,
        size: query.value.pageSize
      })
      requests.value = fillRequestDisplayNames(response.data.records)
      total.value = response.data.total
      return
    }

    if (currentUserId.value !== null) {
      const response = await getLicenseRequestsByUserIdApi(currentUserId.value, {
        page: query.value.pageNum,
        size: query.value.pageSize
      })
      requests.value = fillRequestDisplayNames(response.data.records)
      total.value = response.data.total
      return
    }

    errorMessage.value = TEXT.missingUserId
    const response = await getLicenseRequestsApi({
      page: 1,
      size: 1000
    })
    applyUserFilterAndPage(fillRequestDisplayNames(response.data.records))
  } catch {
    errorMessage.value = TEXT.loadFailed
    const mockResponse = await getLicenseRequestsMock({
      page: 1,
      size: 1000
    })
    applyUserFilterAndPage(fillRequestDisplayNames(mockResponse.data.records))
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  query.value.pageNum = page
  fetchRequests()
}

const handleDownload = async (row: LicenseRequestItem) => {
  const label = row.licenseNo ?? row.requestId
  const filename = `license-${label}.lic`
  try {
    const blob = await downloadLicenseFileApi(row.requestId)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success(getDownloadStartedMessage(label))
  } catch {
    try {
      const blob = await downloadLicenseFileMock(row.requestId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
      ElMessage.success(getDownloadStartedMessage(label))
    } catch {
      ElMessage.error(TEXT.downloadFailed)
    }
  }
}

onMounted(async () => {
  await loadCatalog()
  await fetchRequests()
})
</script>

<template>
  <div class="license-download-page">
    <div class="page-header">
      <div>
        <h2 class="title">{{ TEXT.title }}</h2>
        <p class="subtitle">{{ TEXT.subtitle }}</p>
      </div>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="warning" show-icon class="error-alert" />

    <el-table :data="requests" style="width: 100%" v-loading="loading" row-key="requestId">
      <el-table-column prop="requestId" :label="TEXT.requestId" min-width="140" />
      <el-table-column prop="categoryName" :label="TEXT.categoryName" min-width="120" />
      <el-table-column prop="moduleName" :label="TEXT.moduleName" min-width="140" />
      <el-table-column :label="TEXT.validPeriod" min-width="180">
        <template #default="{ row }">{{ row.validFrom }} ~ {{ row.validTo }}</template>
      </el-table-column>
      <el-table-column prop="usageCount" :label="TEXT.usageCount" min-width="100" />
      <el-table-column :label="TEXT.status" min-width="110">
        <template #default="{ row }">
          <el-tag :type="LICENSE_REQUEST_STATUS_TYPES[row.status]">
            {{ LICENSE_REQUEST_STATUS_LABELS[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="licenseNo" :label="TEXT.licenseNo" min-width="160">
        <template #default="{ row }">{{ row.licenseNo || "-" }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" :label="TEXT.createdAt" min-width="120" />
      <el-table-column :label="TEXT.action" width="140">
        <template #default="{ row }">
          <el-button
            v-if="isAllocatedLicenseStatus(row.status) && row.licenseNo"
            size="small"
            type="primary"
            @click="handleDownload(row)"
          >
            {{ TEXT.download }}
          </el-button>
          <span v-else class="muted">--</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      background
      layout="total, prev, pager, next, jumper"
      :total="total"
      :current-page="query.pageNum"
      :page-size="query.pageSize"
      @current-change="handlePageChange"
      class="pagination"
      :disabled="loading"
    />
  </div>
</template>

<style scoped lang="scss">
.license-download-page {
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

.error-alert {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.muted {
  color: #9ca3af;
}
</style>
