<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import {
  ElSelect,
  ElOption,
  ElTable,
  ElTableColumn,
  ElButton,
  ElPagination,
  ElUpload,
  ElMessage,
  ElDialog,
  ElForm,
  ElFormItem,
  ElImage,
  ElMessageBox
} from "element-plus"
import {
  getFileListApi,
  uploadFileApi,
  downloadFileApi,
  getPreviewImageApi,
  DbType,
  deleteFileApi
} from "@/api/dataManagement"
import { formatBytes } from "@/utils/format"
import { formatDateTime } from "@/utils/format"

// 数据库列表
const databases = ref([
  { id: DbType.SimulationResult, name: "仿真结果数据库" },
  { id: DbType.ExampleLibrary, name: "算例库" },
  { id: DbType.MaterialConstitutive, name: "材料本构数据库" },
  { id: DbType.ConnectionPerformance, name: "连接性能数据库" },
  { id: DbType.ModelLibrary, name: "模型库" },
  { id: DbType.AircraftDummy, name: "航空假人库" }
])

// 当前选中的数据库
const selectedDatabase = ref<DbType>(DbType.SimulationResult)

// 文件列表数据
const fileList = ref<any[]>([])
const totalFiles = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const isLoading = ref(false)
// 搜索关键词
const searchKeyword = ref("")

// 上传相关状态
const showUploadDialog = ref(false)
const uploadForm = reactive({
  fileName: "",
  file: null as File | null,
  previewImage: null as File | null
})

// 预览相关状态
const showPreviewDialog = ref(false)
const previewLoading = ref(false)
const previewImageUrl = ref("")
const previewTitle = ref("")
const PREVIEW_IMAGE_MAX_SIZE = 10 * 1024 * 1024
const PREVIEW_IMAGE_ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"]

// 获取文件列表
const fetchFiles = async () => {
  if (!selectedDatabase.value) return

  isLoading.value = true
  try {
    const response = await getFileListApi({
      dbType: selectedDatabase.value,
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value
    })

    // 修改判断条件为数值比较
    if (response.code === 200) {
      fileList.value = response.data.records
      totalFiles.value = response.data.total
    } else {
      const errorMessage = response.message || "未知错误"
      ElMessage.error(`获取文件列表失败: ${errorMessage}`)
      console.error("获取文件列表失败:", errorMessage, response)
    }
  } catch (error: any) {
    // 更详细的错误处理
    if (error.response) {
      // HTTP响应错误
      const status = error.response.status
      const errorData = error.response.data
      const errorMessage = errorData.message || `HTTP错误 ${status}`

      if (status === 401) {
        ElMessage.error("未授权，请先登录")
        // 可以跳转到登录页面
      } else if (status === 403) {
        ElMessage.error("权限不足")
      } else {
        ElMessage.error(`获取文件列表失败: ${errorMessage}`)
      }

      console.error("获取文件列表HTTP错误:", status, errorData)
    } else {
      // 网络错误或其他错误
      const errorMessage = error.message || "未知网络错误"
      ElMessage.error(`获取文件列表失败: ${errorMessage}`)
      console.error("获取文件列表网络错误:", error)
    }
  } finally {
    isLoading.value = false
  }
}

// 数据库切换处理
const handleDatabaseChange = () => {
  currentPage.value = 1
  fetchFiles()
}

// 分页处理
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchFiles()
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  fetchFiles()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ""
  currentPage.value = 1
  fetchFiles()
}

// 下载文件
const downloadFile = async (fileId: string) => {
  try {
    const response = await downloadFileApi({
      dbType: selectedDatabase.value,
      field: fileId
    })

    const blob = response.data
    const disposition = response.headers["content-disposition"]

    let fileName = `file_${fileId}.dat`
    if (disposition) {
      const match = disposition.match(/filename\*=UTF-8''(.+)/)
      if (match && match[1]) {
        fileName = decodeURIComponent(match[1])
      } else {
        const fallbackMatch = disposition.match(/filename="?([^"]+)"?/)
        if (fallbackMatch && fallbackMatch[1]) {
          fileName = fallbackMatch[1]
        }
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success(`文件下载成功: ${fileName}`)
  } catch (error: any) {
    if (error.response) {
      const blob = error.response.data
      if (blob instanceof Blob && blob.type === "application/json") {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string)
            console.error("服务器返回的错误详情:", errorData)
            ElMessage.error(`下载失败: ${errorData.message || errorData.msg || "未知错误"}`)
          } catch (e) {
            console.error("解析错误响应失败:", e)
          }
        }
        reader.readAsText(blob)
      }
    } else {
      ElMessage.error(`下载失败: ${error.message || "未知错误"}`)
    }
  }
}

// 删除文件
const deleteFile = async (fileId: string, fileName: string) => {
  try {
    // 1. 显示确认对话框
    const confirmResult = await ElMessageBox.confirm(`确定要删除文件"${fileName}"吗？此操作不可撤销。`, "删除确认", {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning"
    })

    // 2. 用户确认删除后执行操作
    if (confirmResult === "confirm") {
      isLoading.value = true
      //
      const response = await deleteFileApi({
        dbType: selectedDatabase.value,
        fileId: fileId
      })

      if (response.code === 200) {
        ElMessage.success(`文件"${fileName}"删除成功`)
        fetchFiles() // 刷新列表
      } else {
        ElMessage.error(`删除失败: ${response.message || "未知错误"}`)
      }
    }
  } catch (error: any) {
    // 用户取消删除时不提示错误
    if (error === "cancel") return

    // 其他错误处理
    ElMessage.error(`操作失败: ${error.message || "系统异常"}`)
    console.error("删除文件错误:", error)
  } finally {
    isLoading.value = false
  }
}

// 打开上传对话框
const openUploadDialog = () => {
  if (!selectedDatabase.value) {
    ElMessage.warning("请先选择数据库")
    return
  }
  showUploadDialog.value = true
}

// 文件选择处理
const handleFileChange = (file: File) => {
  uploadForm.file = file
  if (!uploadForm.fileName) {
    // 使用文件名（不含扩展名）作为默认文件名
    uploadForm.fileName = file.name.replace(/\.[^/.]+$/, "")
  }
}

// 预览图选择处理
const handlePreviewImageChange = (file: File) => {
  if (!PREVIEW_IMAGE_ACCEPT_TYPES.includes(file.type)) {
    ElMessage.warning("预览图格式仅支持 JPG/PNG/WEBP")
    uploadForm.previewImage = null
    return
  }
  if (file.size > PREVIEW_IMAGE_MAX_SIZE) {
    ElMessage.warning("预览图不能超过 10MB")
    uploadForm.previewImage = null
    return
  }
  uploadForm.previewImage = file
}

const resetUploadForm = () => {
  uploadForm.fileName = ""
  uploadForm.file = null
  uploadForm.previewImage = null
}

const clearPreviewBlobUrl = () => {
  if (previewImageUrl.value) {
    URL.revokeObjectURL(previewImageUrl.value)
    previewImageUrl.value = ""
  }
}

const closePreviewDialog = () => {
  showPreviewDialog.value = false
  previewLoading.value = false
  previewTitle.value = ""
  clearPreviewBlobUrl()
}

const parseBlobErrorMessage = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    if (!(blob instanceof Blob) || blob.type !== "application/json") {
      resolve("")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const errorData = JSON.parse(reader.result as string)
        resolve(errorData?.message || errorData?.msg || "")
      } catch {
        resolve("")
      }
    }
    reader.onerror = () => resolve("")
    reader.readAsText(blob)
  })
}

// 预览图片
const previewFileImage = async (row: any) => {
  if (!row?.hasPreview) {
    ElMessage.info("该文件暂无预览图")
    return
  }

  previewLoading.value = true
  previewTitle.value = row.fileName || "预览图片"
  showPreviewDialog.value = true
  clearPreviewBlobUrl()

  try {
    const response = await getPreviewImageApi({
      dbType: selectedDatabase.value,
      fileId: row.id
    })

    const blob = response.data
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error("未获取到预览图片")
    }
    previewImageUrl.value = URL.createObjectURL(blob)
  } catch (error: any) {
    let errorMessage = error.message || "获取预览图片失败"
    if (error.response?.data instanceof Blob) {
      const blobMessage = await parseBlobErrorMessage(error.response.data)
      if (blobMessage) {
        errorMessage = blobMessage
      }
    }
    ElMessage.error(errorMessage)
    closePreviewDialog()
  } finally {
    previewLoading.value = false
  }
}

// 提交上传
const submitUpload = async () => {
  if (!uploadForm.file || !uploadForm.fileName) {
    ElMessage.warning("请选择文件并填写文件名")
    return
  }

  if (uploadForm.previewImage) {
    if (!PREVIEW_IMAGE_ACCEPT_TYPES.includes(uploadForm.previewImage.type)) {
      ElMessage.warning("预览图格式仅支持 JPG/PNG/WEBP")
      return
    }
    if (uploadForm.previewImage.size > PREVIEW_IMAGE_MAX_SIZE) {
      ElMessage.warning("预览图不能超过 10MB")
      return
    }
  }

  isLoading.value = true
  try {
    const formData = new FormData()
    formData.append("dbType", selectedDatabase.value)
    formData.append("fileName", uploadForm.fileName)
    formData.append("file", uploadForm.file)
    if (uploadForm.previewImage) {
      formData.append("previewImage", uploadForm.previewImage)
    }

    const response = await uploadFileApi(formData)

    // 修改判断条件，与 handleUploadSuccess 方法一致
    if (response.code === 200) {
      ElMessage.success("文件上传成功")
      showUploadDialog.value = false
      resetUploadForm()
      currentPage.value = 1
      fetchFiles()
    } else {
      const errorMessage = response.message || "未知错误"
      ElMessage.error(`文件上传失败: ${errorMessage}`)
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || "文件上传时发生未知错误"
    ElMessage.error(errorMessage)
    console.error("文件上传错误详情:", error)
  } finally {
    isLoading.value = false
  }
}

// 初始化
onMounted(() => {
  fetchFiles()
})
</script>

<template>
  <div class="data-management-container">
    <!-- 数据库选择区域 -->
    <div class="database-selection">
      <el-select v-model="selectedDatabase" placeholder="请选择数据库" @change="handleDatabaseChange">
        <el-option v-for="db in databases" :key="db.id" :label="db.name" :value="db.id" />
      </el-select>

      <div class="search-container">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入文件名关键词搜索"
          clearable
          @keydown.enter="handleSearch"
          @clear="resetSearch"
        >
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <el-button type="primary" @click="openUploadDialog" :disabled="!selectedDatabase"> 上传文件到该数据库 </el-button>
    </div>

    <!-- 文件列表表格 -->
    <el-table :data="fileList" :style="{ width: '100%' }" v-loading="isLoading">
      <el-table-column prop="fileName" label="文件名" min-width="200" />
      <el-table-column label="大小" width="120">
        <template #default="{ row }">
          {{ formatBytes(row.fileSize) }}
        </template>
      </el-table-column>
      <el-table-column label="上传时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.updateTime) }}
        </template>
      </el-table-column>
      <el-table-column label="预览" width="110">
        <template #default="{ row }">
          <el-button v-if="row.hasPreview" type="primary" link @click="previewFileImage(row)">预览</el-button>
          <span v-else>--</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="downloadFile(row.id)"> 下载 </el-button>
          <el-button type="primary" size="small" @click="deleteFile(row.id, row.fileName)"> 删除 </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页控件 -->
    <el-pagination
      background
      layout="total, prev, pager, next, jumper"
      :total="totalFiles"
      :current-page="currentPage"
      :page-size="pageSize"
      @current-change="handlePageChange"
      class="pagination"
      :disabled="isLoading"
    />

    <!-- 上传文件对话框 -->
    <el-dialog v-model="showUploadDialog" title="上传文件" width="500px" @close="resetUploadForm">
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="数据库">
          <div>{{ databases.find((db) => db.id === selectedDatabase)?.name }}</div>
        </el-form-item>

        <el-form-item label="文件名" required>
          <el-input v-model="uploadForm.fileName" placeholder="请输入文件名" />
        </el-form-item>

        <el-form-item label="选择文件" required>
          <el-upload
            class="upload-demo"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="(file) => handleFileChange(file.raw)"
          >
            <template #trigger>
              <el-button type="primary">选择文件</el-button>
            </template>
            <div class="file-info" v-if="uploadForm.file">
              {{ uploadForm.file.name }} ({{ (uploadForm.file.size / 1024).toFixed(2) }}KB)
            </div>
          </el-upload>
        </el-form-item>

        <el-form-item label="预览图">
          <el-upload
            class="upload-demo"
            :auto-upload="false"
            :show-file-list="false"
            accept="image/png,image/jpeg,image/webp"
            :on-change="(file) => handlePreviewImageChange(file.raw)"
          >
            <template #trigger>
              <el-button>选择预览图</el-button>
            </template>
            <div class="file-info" v-if="uploadForm.previewImage">
              {{ uploadForm.previewImage.name }} ({{ (uploadForm.previewImage.size / 1024).toFixed(2) }}KB)
            </div>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="(showUploadDialog = false), resetUploadForm()">取消</el-button>
        <el-button type="primary" @click="submitUpload">上传</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPreviewDialog" :title="`${previewTitle} - 预览`" width="720px" @close="closePreviewDialog">
      <div class="preview-content" v-loading="previewLoading">
        <el-image v-if="previewImageUrl" :src="previewImageUrl" fit="contain" class="preview-image" />
        <el-empty v-else-if="!previewLoading" description="暂无可预览图片" :image-size="100" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.data-management-container {
  padding: 20px;
  background-color: #fff;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.database-selection {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;

  .el-select {
    flex: 1;
    max-width: 400px;
  }
}

.pagination {
  margin-top: 20px;
  justify-content: center;
}

.file-info {
  margin-top: 10px;
  font-size: 12px;
  color: #666;
  padding: 5px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.preview-content {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  width: 100%;
  max-height: 65vh;
}
</style>
