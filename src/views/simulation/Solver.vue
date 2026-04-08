<script setup>
import axios from "axios"
import { ref, onBeforeUnmount, onMounted } from "vue"
import { useRoute } from "vue-router" // 引入 useRoute 来获取路由参数

const route = useRoute() // 获取路由实例
const isExeRunning = ref(false)
const container = ref(null)
let positionInterval
const errorMessage = ref("")
const statusMessage = ref("准备就绪")
let intervalId
const positionLock = ref(false)
const computeResource = ref("GPU") // 新增计算资源选择，默认为GPU

// 获取路由参数中的任务类型
const taskType = ref(route.query.taskType || "")

// 添加防抖函数
let debounceTimer = null
const debounce = (func, delay) => {
  return (...args) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

// 修改坐标计算 - 不再使用devicePixelRatio
const getContainerPosition = () => {
  if (!container.value) return { x: 0, y: 0, width: 0, height: 0 }

  const rect = container.value.getBoundingClientRect()

  // 获取视口相对于屏幕左上角的偏移
  const viewportX = window.screenLeft !== undefined ? window.screenLeft : window.screenX
  const viewportY = window.screenTop !== undefined ? window.screenTop : window.screenY

  return {
    x: Math.round(viewportX + rect.left),
    y: Math.round(viewportY + rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
}

// 检查程序状态
const checkExeStatus = async () => {
  try {
    statusMessage.value = "检查程序状态..."
    const response = await axios.get("http://localhost:3334/check-exe-status", {
      timeout: 3000 // 添加超时时间
    })
    isExeRunning.value = response.data.isRunning
    statusMessage.value = isExeRunning.value ? "程序正在运行" : "准备就绪"
    return isExeRunning.value
  } catch (error) {
    console.error("检查程序状态失败:", error)
    // 连接失败时，假设程序已停止
    isExeRunning.value = false
    statusMessage.value = "无法连接到服务器"
    errorMessage.value = "无法连接到服务器，请确保服务器已启动"
    return false
  }
}

const stopStatusPolling = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

//修复重复check-exe-status请求
const startStatusPolling = () => {
  // 关键：先清除已有定时器，避免重复创建
  stopStatusPolling()
  intervalId = setInterval(async () => {
    try {
      statusMessage.value = "检查程序状态..."
      const response = await axios.get("http://localhost:3334/check-exe-status")
      isExeRunning.value = response.data.isRunning
      statusMessage.value = isExeRunning.value ? "程序正在运行" : "准备就绪"
      if (!isExeRunning.value) {
        stopStatusPolling()
      }
    } catch (error) {
      console.error("检查 .exe 程序状态时出错:", error)
      // 当连接失败时，假设程序已停止
      isExeRunning.value = false
      statusMessage.value = "服务器连接失败，程序可能已停止"
      stopStatusPolling()
    }
  }, 2000)
}

const startExe = async (exeType) => {
  // 添加防重复点击保护
  if (positionLock.value) {
    console.log("正在处理其他操作，请稍后")
    return
  }

  try {
    positionLock.value = true
    statusMessage.value = "检查程序状态..."

    const isRunning = await checkExeStatus()
    console.log("当前程序运行状态:", isRunning)

    if (isRunning) {
      statusMessage.value = "程序已在运行中"
      return
    }
    // 清除之前的错误
    errorMessage.value = ""
    statusMessage.value = "正在启动程序..."

    // 新增：传递计算资源参数
    const params = {
      resource: computeResource.value
    }

    // 根据不同的按钮类型启动不同的.exe
    const startResponse = await axios.get(`http://localhost:3334/start-solver-${exeType}-exe`, {
      params, // 传递计算资源参数
      timeout: 30000 // 增加超时时间
    })

    console.log("启动响应:", startResponse.data)
    statusMessage.value = "程序已启动，开始定位..."
    isExeRunning.value = true
    startStatusPolling()

    // 等待更长时间确保程序完全启动
    await new Promise((r) => setTimeout(r, 5000))

    // 再次检查程序是否真的在运行
    const finalCheck = await checkExeStatus()
    console.log("启动后检查状态:", finalCheck)

    if (!finalCheck) {
      throw new Error("程序启动后未检测到运行状态")
    }

    // 延迟定位，确保程序窗口已完全加载
    setTimeout(() => {
      console.log("程序启动完成，开始定位窗口")
      debouncedUpdateWindowPosition()
    }, 2000)
  } catch (error) {
    console.error("启动程序失败:", error)
    isExeRunning.value = false
    statusMessage.value = "启动失败"
    errorMessage.value = `启动失败: ${error.response?.data || error.message}`
  } finally {
    positionLock.value = false
  }
}

// 根据任务类型启动对应的程序
const startByTaskType = () => {
  if (taskType.value && !isExeRunning.value) {
    // 映射任务类型到对应的exe类型
    const exeTypeMap = {
      结构: "structure",
      冲击: "impact",
      多体: "multibody"
    }

    const mappedType = exeTypeMap[taskType.value]

    if (mappedType) {
      statusMessage.value = `正在根据任务类型启动程序: ${taskType.value}`
      setTimeout(() => {
        startExe(mappedType)
      }, 1000) // 延迟1秒执行，确保UI更新
    } else {
      errorMessage.value = `未知的任务类型: ${taskType.value}`
    }
  }
}

// 抽取出单独的定位函数，方便调用
const updateWindowPosition = async () => {
  if (positionLock.value) return // 如果正在定位，直接返回
  if (!isExeRunning.value || !container.value) return

  try {
    statusMessage.value = "正在定位窗口..."
    positionLock.value = true
    const position = getContainerPosition()
    console.log("计算的位置:", position)

    // 检查位置值是否合理
    if (position.width <= 0 || position.height <= 0) {
      console.error("计算得到的窗口尺寸无效:", position)
      statusMessage.value = "窗口尺寸计算错误"
      return
    }

    // 添加重试逻辑
    let retries = 3
    let success = false

    while (retries > 0 && !success) {
      try {
        const positionResponse = await axios.post("http://localhost:3334/position-window", position, { timeout: 5000 })

        console.log("定位响应:", positionResponse.data)
        success = true
        statusMessage.value = "窗口定位成功"
        break
      } catch (retryError) {
        console.error(`定位重试失败 (剩余${retries - 1}次):`, retryError)
        retries--
        await new Promise((r) => setTimeout(r, 1000)) // 等待1秒后重试
      }
    }
  } catch (posError) {
    console.error("定位失败:", posError)
    statusMessage.value = "窗口定位失败，但程序可能已启动"
    errorMessage.value = `定位失败: ${posError.response?.data || posError.message}`
  } finally {
    positionLock.value = false
  }
}

//防抖版本更新位置函数
const debouncedUpdateWindowPosition = debounce(updateWindowPosition, 500)

// 监听container的大小变化
const resizeObserver =
  typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => {
        if (isExeRunning.value) {
          debouncedUpdateWindowPosition()
        }
      })
    : null

// 添加监听窗口大小变化和滚动事件
onMounted(() => {
  // 初始检查
  checkExeStatus()

  // 添加resize观察器
  if (resizeObserver && container.value) {
    resizeObserver.observe(container.value)
  }

  // 添加窗口焦点事件处理
  window.addEventListener("focus", debouncedUpdateWindowPosition)

  // 添加滚动事件监听
  window.addEventListener("scroll", debouncedUpdateWindowPosition)

  // 添加窗口大小变化事件监听
  window.addEventListener("resize", debouncedUpdateWindowPosition)

  // 在组件挂载后检查是否有任务类型参数
  startByTaskType()
})

// 清理事件监听
onBeforeUnmount(() => {
  // 清理所有定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (positionInterval) {
    clearInterval(positionInterval)
    positionInterval = null
  }

  // 停止状态轮询
  stopStatusPolling()

  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value)
  }

  window.removeEventListener("focus", debouncedUpdateWindowPosition)
  window.removeEventListener("scroll", debouncedUpdateWindowPosition)
  window.removeEventListener("resize", debouncedUpdateWindowPosition)
})
</script>

<template>
  <div>
    <div class="preview-tip">提示：可截取一张有代表性的仿真图片，后续在数据管理上传数据库文件时可作为预览图使用。</div>

    <!-- 按钮区域 -->
    <div class="button-group">
      <button @click="startExe('structure')" :disabled="isExeRunning || positionLock">结构</button>
      <button @click="startExe('impact')" :disabled="isExeRunning || positionLock">冲击</button>
      <button @click="startExe('multibody')" :disabled="isExeRunning || positionLock">多体</button>
    </div>

    <!-- 新增计算资源选择区域 -->
    <div class="resource-selection">
      <label>计算资源：</label>
      <label> <input type="radio" v-model="computeResource" value="GPU" :disabled="isExeRunning" /> GPU </label>
      <label> <input type="radio" v-model="computeResource" value="CPU" :disabled="isExeRunning" /> CPU </label>
    </div>

    <div class="status-bar">
      <span class="status">{{ statusMessage }}</span>
      <button v-if="isExeRunning" @click="debouncedUpdateWindowPosition" class="refresh-btn" :disabled="positionLock">
        {{ positionLock ? "定位中..." : "刷新位置" }}
      </button>
    </div>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

    <!-- 显示当前任务类型 -->
    <div v-if="taskType" class="task-type-info">
      当前任务类型: <strong>{{ taskType }}</strong>
    </div>

    <div ref="container" class="exe-container" :class="{ active: isExeRunning }">
      <div v-if="!isExeRunning" class="placeholder-message">点击"启动程序"按钮加载内嵌应用</div>
      <div v-else class="loading-message">正在加载程序窗口...如果看不到程序界面，请点击"刷新位置"按钮</div>
    </div>
  </div>
</template>

<style scoped>
.preview-tip {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #ffe58f;
  background: #fffbe6;
  color: #8c6d1f;
  font-size: 13px;
}

.button-group {
  margin-bottom: 10px;
}

button {
  padding: 8px 15px;
  margin-right: 10px;
  font-size: 14px;
  cursor: pointer;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* 新增计算资源选择样式 */
.resource-selection {
  margin: 10px 0;
  padding: 8px;
  background-color: #f0f8ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.resource-selection label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.status-bar {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.status {
  margin-left: 10px;
  font-size: 14px;
  color: #666;
  flex-grow: 1;
}

.refresh-btn {
  margin-left: 10px;
  font-size: 12px;
  padding: 4px 8px;
}

.exe-container {
  width: 80%;
  height: 60vh;
  margin: 20px auto;
  border: 1px dashed #ccc;
  background-color: #f9f9f9;
  position: relative;
  transition: border-color 0.3s;
}

.exe-container.active {
  border: 1px solid #4c8bf5;
  background-color: transparent;
}

.error-message {
  color: red;
  margin: 10px 0;
  padding: 8px;
  background-color: #fff3f3;
  border-radius: 4px;
}

.loading-message,
.placeholder-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #999;
  text-align: center;
}

.task-type-info {
  margin: 10px 0;
  padding: 8px;
  background-color: #e8f4ff;
  border-radius: 4px;
  font-size: 14px;
}
</style>
