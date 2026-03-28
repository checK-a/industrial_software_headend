<script lang="ts" setup>
import { ref } from "vue"
import { useTheme } from "@/hooks/useTheme"
import { useUserStore } from "@/store/modules/user"
const userStore = useUserStore() // 使用用户 store
import { useSensorStore } from "@/store/index"
const SensorStore = useSensorStore()
// const ReminderStore = useReminderStore()
import { useLB1ReminderStore, useMB1ReminderStore, useMB2ReminderStore } from "@/store/index"
const LB1ReminderStore = useLB1ReminderStore()
const MB1ReminderStore = useMB1ReminderStore()
const MB2ReminderStore = useMB2ReminderStore()
import { Wait10minApi, SendPassInfoApi, StopUpdateApi } from "@/api/table"
import { CancelBookApi } from "@/api/table"
import { ElMessage } from "element-plus"
import { useRouter } from "vue-router"
const router = useRouter()
//import { ElNotification } from "element-plus"
// 将 Element Plus 的语言设置为中文
//import zhCn from "element-plus/es/locale/lang/zh-cn"

const { initTheme } = useTheme()

/** 初始化主题 */
initTheme()

let found = false
let AISfound = false
import { useAddOneStore, useLocationStore } from "@/store/index"
import { useAISStore } from "@/store/index"
// const SpeakerStore = useSpeakerStore()
// 通过 useLocationStore 获取 locationArr
const locationStore = useLocationStore()
const AddOneStore = useAddOneStore()
// 通过 useAISStore 获取 AISArr
const AISStore = useAISStore()

// 在组件中使用 locationArr
const locationArr = locationStore.locationArr
// 在组件中使用 AISArr
const AISArr = AISStore.AISArr
// const locationArr: Mylocation[] = reactive<Mylocation[]>([])
const reconnectAttempts = ref(0)
let socket: WebSocket | null = null
// 刷新网页时重连websocket
const relinkws = () => {
  reconnectAttempts.value = 0 // 重置重连次数
  connectWebSocket()
  // simulateWebSocketCloseOrError()
  // startInterval() //每隔5秒发送模拟message消息数据
}
const connectWebSocket = () => {
  // 刷新清空 locationArr  AISArr
  // 清空 locationArr 数组
  locationArr.length = 0

  // 清空 AISArr 数组
  AISArr.length = 0

  const username = userStore.username // 获取用户名
  console.log("@@@username:", username)
  if (username !== "") {
    console.log("刷新网页时重连websocket")
    // 这里的leap后期要改成用户登录时的username
    const socketUrl = "ws://36.103.234.59:8060/ws/admin/" + username
    console.log(socketUrl)
    // if (socket != null) {
    //   socket.close()
    //   socket = null
    // }
    socket = new WebSocket(socketUrl)

    socket.addEventListener("open", (event) => {
      console.log("WebSocket 连接已建立:", event)
      // console.log("oldGPS:", locationArr)
      // console.log("oldAIS:", AISArr)
      reconnectAttempts.value = 0 // 连接成功后重置重连计数
    })

    socket.addEventListener("message", (event) => {
      console.log("收到 WebSocket 消息:", event.data)
      try {
        const parsedData = JSON.parse(event.data)

        if (parsedData.type === "collision") {
          if (parsedData.registered === false) {
            // Alarm ID: ${parsedData.alarmID} ; Both vessels are registered: ${parsedData.registered}
            alert(
              `Alarm Detail: ${parsedData.alarmDetail} ; Note: There has unregistered vessel, please go to the collision alert page for details.`
            )
          } else {
            alert(`Alarm ID: ${parsedData.alarmID} ; Both vessels are registered: ${parsedData.registered}
            Alarm Detail: ${parsedData.alarmDetail}`)
          }
          AddOneStore.updateAddOne(AddOneStore.AddOne + 1)
        }
        if (parsedData.type === "message") {
          alert(`Message: ${parsedData.message}`)
        }
        if (parsedData.type === "GPS") {
          found = false
          for (const location of locationArr) {
            if (location.vno === parsedData.vno) {
              location.latitude = parsedData.latitude
              location.longitude = parsedData.longitude
              // location.booked = parsedData.booked
              location.state = parsedData.state
              location.arrtime = parsedData.arrtime
              found = true
              break
            }
          }
          // 如果遍历完了都没有找到，说明这是一个新的vno，将其数据push进locationArr数组里面
          if (!found) {
            locationArr.push({
              vno: parsedData.vno,
              latitude: parsedData.latitude,
              longitude: parsedData.longitude,
              state: parsedData.state,
              arrtime: parsedData.arrtime
            })
          }
          // console.log("new:", locationArr)
        }
        if (parsedData.type === "AIS") {
          AISfound = false
          for (const location of AISArr) {
            if (location.mmsi === parsedData.mmsi) {
              location.latitude = parsedData.latitude
              location.longitude = parsedData.longitude
              location.course = parsedData.course
              location.heading = parsedData.heading
              location.speed = parsedData.speed
              location.shipname = parsedData.shipname
              // location.booked = parsedData.booked
              location.state = parsedData.state
              location.arrtime = parsedData.arrtime
              AISfound = true
              break
            }
          }
          console.log(AISfound)

          // 如果遍历完了都没有找到，说明这是一个新的mmsi，将其数据push进AISArr数组里面
          if (!AISfound) {
            AISArr.push({
              mmsi: parsedData.mmsi,
              latitude: parsedData.latitude,
              longitude: parsedData.longitude,
              course: parsedData.course,
              heading: parsedData.heading,
              speed: parsedData.speed,
              shipname: parsedData.shipname,
              state: parsedData.state,
              arrtime: parsedData.arrtime
            })
          }
          console.log("newAIS:", AISArr)
        }
        // if (parsedData.type === "reminder") {
        //   console.log("reminder")
        //   if (parsedData.time === 15) {
        //     console.log("15")
        //   }
        //   if (parsedData.time === 10) {
        //     console.log("10")

        //     SpeakerStore.speakerCount += 1
        //     SpeakerStore.bridgeName = parsedData.bridge
        //   }
        //   if (parsedData.time === 5) {
        //     console.log("5")
        //   }

        //   // 处理reminder弹窗的相关代码 - 先对ReminderStore赋值
        //   ReminderStore.reminderCount += 1
        //   ReminderStore.reminderType = parsedData.type
        //   ReminderStore.reminderTime = parsedData.time
        //   ReminderStore.reminderState = parsedData.state
        //   ReminderStore.reminderVno.splice(0, ReminderStore.reminderVno.length, ...parsedData.vno)
        //   ReminderStore.reminderBridge = parsedData.bridge

        //   // 显示弹窗 - 再打开弹窗 相关内容的信息肯定已经更新了
        //   if (parsedData.time === 5 || parsedData.time === 10 || parsedData.time === 15) {
        //     showModal()
        //   }
        //   if (parsedData.time === 0) {
        //     showPassAlert()
        //   }
        // }
        if (parsedData.type === "reminder") {
          console.log("reminder")
          // 更新相关reminderStore
          if (parsedData.time === 15 && parsedData.bridge === "LB1") {
            console.log("reminder-15-LB1")
            LB1ReminderStore.LB1ReminderCountPass += 1
            LB1ReminderStore.LB1ReminderType = parsedData.type
            LB1ReminderStore.LB1ReminderTime = parsedData.time
            LB1ReminderStore.LB1ReminderOpenedPass = parsedData.opened
            LB1ReminderStore.LB1ReminderBridge = parsedData.bridge

            showModalLB1_15()
          }
          if (parsedData.time === 15 && parsedData.bridge === "MB1") {
            console.log("reminder-15-MB1")
            MB1ReminderStore.MB1ReminderCountPass += 1
            MB1ReminderStore.MB1ReminderType = parsedData.type
            MB1ReminderStore.MB1ReminderTime = parsedData.time
            MB1ReminderStore.MB1ReminderOpenedPass = parsedData.opened
            MB1ReminderStore.MB1ReminderBridge = parsedData.bridge
            showModalMB1_15()
          }
          if (parsedData.time === 15 && parsedData.bridge === "MB2") {
            console.log("reminder-15-MB2")
            MB2ReminderStore.MB2ReminderCountPass += 1
            MB2ReminderStore.MB2ReminderType = parsedData.type
            MB2ReminderStore.MB2ReminderTime = parsedData.time
            MB2ReminderStore.MB2ReminderOpenedPass = parsedData.opened
            MB2ReminderStore.MB2ReminderBridge = parsedData.bridge
            showModalMB2_15()
          }
          if (parsedData.time === 10 && parsedData.bridge === "LB1") {
            console.log("reminder-10-LB1")
            // type和time是一样得
            LB1ReminderStore.LB1ReminderType = parsedData.type
            LB1ReminderStore.LB1ReminderTime = parsedData.time
            if (parsedData.deVessel === 0) {
              console.log("reminder-10-LB1-未检测到船只在等候区")
              // 用UnPass组
              LB1ReminderStore.LB1ReminderCountUnPass += 1
              LB1ReminderStore.LB1ReminderLightUnPass = parsedData.light
              LB1ReminderStore.LB1ReminderGateUnPass = parsedData.gate
              LB1ReminderStore.LB1ReminderDeVesselUnPass = parsedData.deVessel
              LB1ReminderStore.LB1ReminderDePedestUnPass = parsedData.dePedest
              LB1ReminderStore.LB1ReminderOpenedUnPass = parsedData.opened
              // ReminderStore.reminderVno.splice(0, ReminderStore.reminderVno.length, ...parsedData.vno)
              LB1ReminderStore.LB1ReminderVnoUnPass.splice(
                0,
                LB1ReminderStore.LB1ReminderVnoUnPass.length,
                ...parsedData.vno
              )
              LB1ReminderStore.LB1ReminderBridge = parsedData.bridge
              showModalLB1_10_0()
            }
            if (parsedData.deVessel === 1) {
              console.log("reminder-10-LB1-检测到船只在等候区")
              // 用Pass组
              LB1ReminderStore.LB1ReminderCountPass += 1
              LB1ReminderStore.LB1ReminderLightPass = parsedData.light
              LB1ReminderStore.LB1ReminderGatePass = parsedData.gate
              LB1ReminderStore.LB1ReminderDeVesselPass = parsedData.deVessel
              LB1ReminderStore.LB1ReminderDePedestPass = parsedData.dePedest
              LB1ReminderStore.LB1ReminderOpenedPass = parsedData.opened
              LB1ReminderStore.LB1ReminderVnoPass.splice(
                0,
                LB1ReminderStore.LB1ReminderVnoPass.length,
                ...parsedData.vno
              )
              LB1ReminderStore.LB1ReminderBridge = parsedData.bridge
              showModalLB1_10_1()
            }
          }
          if (parsedData.time === 10 && parsedData.bridge === "MB1") {
            console.log("reminder-10-MB1")
            MB1ReminderStore.MB1ReminderType = parsedData.type
            MB1ReminderStore.MB1ReminderTime = parsedData.time
            if (parsedData.deVessel === 0) {
              console.log("reminder-10-MB1-未检测到船只在等候区")
              // 用UnPass组
              MB1ReminderStore.MB1ReminderCountUnPass += 1
              MB1ReminderStore.MB1ReminderLightUnPass = parsedData.light
              MB1ReminderStore.MB1ReminderGateUnPass = parsedData.gate
              MB1ReminderStore.MB1ReminderDeVesselUnPass = parsedData.deVessel
              MB1ReminderStore.MB1ReminderDePedestUnPass = parsedData.dePedest
              MB1ReminderStore.MB1ReminderOpenedUnPass = parsedData.opened
              MB1ReminderStore.MB1ReminderVnoUnPass.splice(
                0,
                MB1ReminderStore.MB1ReminderVnoUnPass.length,
                ...parsedData.vno
              )
              MB1ReminderStore.MB1ReminderBridge = parsedData.bridge
              showModalMB1_10_0()
            }
            if (parsedData.deVessel === 1) {
              console.log("reminder-10-MB1-检测到船只在等候区")
              // 用Pass组
              MB1ReminderStore.MB1ReminderCountPass += 1
              MB1ReminderStore.MB1ReminderLightPass = parsedData.light
              MB1ReminderStore.MB1ReminderGatePass = parsedData.gate
              MB1ReminderStore.MB1ReminderDeVesselPass = parsedData.deVessel
              MB1ReminderStore.MB1ReminderDePedestPass = parsedData.dePedest
              MB1ReminderStore.MB1ReminderOpenedPass = parsedData.opened
              MB1ReminderStore.MB1ReminderVnoPass.splice(
                0,
                MB1ReminderStore.MB1ReminderVnoPass.length,
                ...parsedData.vno
              )
              MB1ReminderStore.MB1ReminderBridge = parsedData.bridge
              showModalMB1_10_1()
            }
          }
          if (parsedData.time === 10 && parsedData.bridge === "MB2") {
            console.log("reminder-10-MB2")
            MB2ReminderStore.MB2ReminderType = parsedData.type
            MB2ReminderStore.MB2ReminderTime = parsedData.time
            if (parsedData.deVessel === 0) {
              console.log("reminder-10-MB2-未检测到船只在等候区")
              // 用UnPass组
              MB2ReminderStore.MB2ReminderCountUnPass += 1
              MB2ReminderStore.MB2ReminderLightUnPass = parsedData.light
              MB2ReminderStore.MB2ReminderGateUnPass = parsedData.gate
              MB2ReminderStore.MB2ReminderDeVesselUnPass = parsedData.deVessel
              MB2ReminderStore.MB2ReminderDePedestUnPass = parsedData.dePedest
              MB2ReminderStore.MB2ReminderOpenedUnPass = parsedData.opened
              MB2ReminderStore.MB2ReminderVnoUnPass.splice(
                0,
                MB2ReminderStore.MB2ReminderVnoUnPass.length,
                ...parsedData.vno
              )
              MB2ReminderStore.MB2ReminderBridge = parsedData.bridge
              showModalMB2_10_0()
            }
            if (parsedData.deVessel === 1) {
              console.log("reminder-10-MB2-检测到船只在等候区")
              // 用Pass组
              MB2ReminderStore.MB2ReminderCountPass += 1
              MB2ReminderStore.MB2ReminderLightPass = parsedData.light
              MB2ReminderStore.MB2ReminderGatePass = parsedData.gate
              MB2ReminderStore.MB2ReminderDeVesselPass = parsedData.deVessel
              MB2ReminderStore.MB2ReminderDePedestPass = parsedData.dePedest
              MB2ReminderStore.MB2ReminderOpenedPass = parsedData.opened
              MB2ReminderStore.MB2ReminderVnoPass.splice(
                0,
                MB2ReminderStore.MB2ReminderVnoPass.length,
                ...parsedData.vno
              )
              MB2ReminderStore.MB2ReminderBridge = parsedData.bridge
              showModalMB2_10_1()
            }
          }
          if (parsedData.time === 5 && parsedData.bridge === "LB1") {
            console.log("reminder-5-LB1")
            LB1ReminderStore.LB1ReminderType = parsedData.type
            LB1ReminderStore.LB1ReminderTime = parsedData.time
            LB1ReminderStore.LB1ReminderBridge = parsedData.bridge
            if (parsedData.deVessel === 1) {
              // 用Pass组
              LB1ReminderStore.LB1ReminderCountPass += 1
              LB1ReminderStore.LB1ReminderLightPass = parsedData.light
              LB1ReminderStore.LB1ReminderGatePass = parsedData.gate
              LB1ReminderStore.LB1ReminderDeVesselPass = parsedData.deVessel
              LB1ReminderStore.LB1ReminderDePedestPass = parsedData.dePedest
              LB1ReminderStore.LB1ReminderOpenedPass = parsedData.opened
              LB1ReminderStore.LB1ReminderVnoPass.splice(
                0,
                LB1ReminderStore.LB1ReminderVnoPass.length,
                ...parsedData.vno
              )
              showModalLB1_5()
            }
          }
          if (parsedData.time === 5 && parsedData.bridge === "MB1") {
            console.log("reminder-5-MB1")
            MB1ReminderStore.MB1ReminderType = parsedData.type
            MB1ReminderStore.MB1ReminderTime = parsedData.time
            MB1ReminderStore.MB1ReminderBridge = parsedData.bridge
            if (parsedData.deVessel === 1) {
              // 用Pass组
              MB1ReminderStore.MB1ReminderCountPass += 1
              MB1ReminderStore.MB1ReminderLightPass = parsedData.light
              MB1ReminderStore.MB1ReminderGatePass = parsedData.gate
              MB1ReminderStore.MB1ReminderDeVesselPass = parsedData.deVessel
              MB1ReminderStore.MB1ReminderDePedestPass = parsedData.dePedest
              MB1ReminderStore.MB1ReminderOpenedPass = parsedData.opened
              MB1ReminderStore.MB1ReminderVnoPass.splice(
                0,
                MB1ReminderStore.MB1ReminderVnoPass.length,
                ...parsedData.vno
              )
              showModalMB1_5()
            }
          }
          if (parsedData.time === 5 && parsedData.bridge === "MB2") {
            console.log("reminder-5-MB2")
            MB2ReminderStore.MB2ReminderType = parsedData.type
            MB2ReminderStore.MB2ReminderTime = parsedData.time
            MB2ReminderStore.MB2ReminderBridge = parsedData.bridge
            if (parsedData.deVessel === 1) {
              // 用Pass组
              MB2ReminderStore.MB2ReminderCountPass += 1
              MB2ReminderStore.MB2ReminderLightPass = parsedData.light
              MB2ReminderStore.MB2ReminderGatePass = parsedData.gate
              MB2ReminderStore.MB2ReminderDeVesselPass = parsedData.deVessel
              MB2ReminderStore.MB2ReminderDePedestPass = parsedData.dePedest
              MB2ReminderStore.MB2ReminderOpenedPass = parsedData.opened
              MB2ReminderStore.MB2ReminderVnoPass.splice(
                0,
                MB2ReminderStore.MB2ReminderVnoPass.length,
                ...parsedData.vno
              )
              showModalMB2_5()
            }
          }
          if (parsedData.time === 0 && parsedData.bridge === "LB1") {
            console.log("reminder-0-LB1")
            LB1ReminderStore.LB1ReminderType = parsedData.type
            LB1ReminderStore.LB1ReminderTime = parsedData.time
            LB1ReminderStore.LB1ReminderBridge = parsedData.bridge
            if (parsedData.deVessel === 1) {
              // 用Pass组
              LB1ReminderStore.LB1ReminderCountPass += 1
              LB1ReminderStore.LB1ReminderLightPass = parsedData.light
              LB1ReminderStore.LB1ReminderGatePass = parsedData.gate
              LB1ReminderStore.LB1ReminderDeVesselPass = parsedData.deVessel
              LB1ReminderStore.LB1ReminderDePedestPass = parsedData.dePedest
              LB1ReminderStore.LB1ReminderOpenedPass = parsedData.opened
              LB1ReminderStore.LB1ReminderVnoPass.splice(
                0,
                LB1ReminderStore.LB1ReminderVnoPass.length,
                ...parsedData.vno
              )
              showModalLB1_0()
            }
          }
          if (parsedData.time === 0 && parsedData.bridge === "MB1") {
            console.log("reminder-0-MB1")
            MB1ReminderStore.MB1ReminderType = parsedData.type
            MB1ReminderStore.MB1ReminderTime = parsedData.time
            MB1ReminderStore.MB1ReminderBridge = parsedData.bridge
            if (parsedData.deVessel === 1) {
              // 用Pass组
              MB1ReminderStore.MB1ReminderCountPass += 1
              MB1ReminderStore.MB1ReminderLightPass = parsedData.light
              MB1ReminderStore.MB1ReminderGatePass = parsedData.gate
              MB1ReminderStore.MB1ReminderDeVesselPass = parsedData.deVessel
              MB1ReminderStore.MB1ReminderDePedestPass = parsedData.dePedest
              MB1ReminderStore.MB1ReminderOpenedPass = parsedData.opened
              MB1ReminderStore.MB1ReminderVnoPass.splice(
                0,
                MB1ReminderStore.MB1ReminderVnoPass.length,
                ...parsedData.vno
              )
              showModalMB1_0()
            }
          }
          if (parsedData.time === 0 && parsedData.bridge === "MB2") {
            console.log("reminder-0-MB2")
            MB2ReminderStore.MB2ReminderType = parsedData.type
            MB2ReminderStore.MB2ReminderTime = parsedData.time
            MB2ReminderStore.MB2ReminderBridge = parsedData.bridge
            if (parsedData.deVessel === 1) {
              // 用Pass组
              MB2ReminderStore.MB2ReminderCountPass += 1
              MB2ReminderStore.MB2ReminderLightPass = parsedData.light
              MB2ReminderStore.MB2ReminderGatePass = parsedData.gate
              MB2ReminderStore.MB2ReminderDeVesselPass = parsedData.deVessel
              MB2ReminderStore.MB2ReminderDePedestPass = parsedData.dePedest
              MB2ReminderStore.MB2ReminderOpenedPass = parsedData.opened
              MB2ReminderStore.MB2ReminderVnoPass.splice(
                0,
                MB2ReminderStore.MB2ReminderVnoPass.length,
                ...parsedData.vno
              )
              showModalMB2_0()
            }
          }
          if (parsedData.time === -5 && parsedData.bridge === "LB1") {
            console.log("reminder--5-LB1")
            LB1ReminderStore.LB1ReminderType = parsedData.type
            LB1ReminderStore.LB1ReminderTime = parsedData.time
            LB1ReminderStore.LB1ReminderBridge = parsedData.bridge
            // 用Pass组
            LB1ReminderStore.LB1ReminderCountPass += 1
            LB1ReminderStore.LB1ReminderLightPass = parsedData.light
            LB1ReminderStore.LB1ReminderGatePass = parsedData.gate
            LB1ReminderStore.LB1ReminderDeVesselPass = parsedData.deVessel
            LB1ReminderStore.LB1ReminderDePedestPass = parsedData.dePedest
            LB1ReminderStore.LB1ReminderOpenedPass = parsedData.opened
            LB1ReminderStore.LB1ReminderVnoPass.splice(0, LB1ReminderStore.LB1ReminderVnoPass.length, ...parsedData.vno)
            showModalLB1__5()
          }
          if (parsedData.time === -5 && parsedData.bridge === "MB1") {
            console.log("reminder--5-MB1")
            MB1ReminderStore.MB1ReminderType = parsedData.type
            MB1ReminderStore.MB1ReminderTime = parsedData.time
            MB1ReminderStore.MB1ReminderBridge = parsedData.bridge
            // 用Pass组
            MB1ReminderStore.MB1ReminderCountPass += 1
            MB1ReminderStore.MB1ReminderLightPass = parsedData.light
            MB1ReminderStore.MB1ReminderGatePass = parsedData.gate
            MB1ReminderStore.MB1ReminderDeVesselPass = parsedData.deVessel
            MB1ReminderStore.MB1ReminderDePedestPass = parsedData.dePedest
            MB1ReminderStore.MB1ReminderOpenedPass = parsedData.opened
            MB1ReminderStore.MB1ReminderVnoPass.splice(0, MB1ReminderStore.MB1ReminderVnoPass.length, ...parsedData.vno)
            showModalMB1__5()
          }
          if (parsedData.time === -5 && parsedData.bridge === "MB2") {
            console.log("reminder--5-MB2")
            MB2ReminderStore.MB2ReminderType = parsedData.type
            MB2ReminderStore.MB2ReminderTime = parsedData.time
            MB2ReminderStore.MB2ReminderBridge = parsedData.bridge
            // 用Pass组
            MB2ReminderStore.MB2ReminderCountPass += 1
            MB2ReminderStore.MB2ReminderLightPass = parsedData.light
            MB2ReminderStore.MB2ReminderGatePass = parsedData.gate
            MB2ReminderStore.MB2ReminderDeVesselPass = parsedData.deVessel
            MB2ReminderStore.MB2ReminderDePedestPass = parsedData.dePedest
            MB2ReminderStore.MB2ReminderOpenedPass = parsedData.opened
            MB2ReminderStore.MB2ReminderVnoPass.splice(0, MB2ReminderStore.MB2ReminderVnoPass.length, ...parsedData.vno)
            showModalMB2__5()
          }
        }
        if (parsedData.type === "sensor") {
          console.log("sensor")
          // 提取时间部分
          const timeString = parsedData.time.split(" ")[1] // 获取 'hh:mm:ss.SSS'
          const resultTime = timeString.split(".")[0] // 去掉毫秒部分，只保留 'hh:mm:ss'
          SensorStore.chartDataS1.push({ time: resultTime, value: parsedData.sensor1 })
          SensorStore.chartDataS2.push({ time: resultTime, value: parsedData.sensor2 })
          SensorStore.chartDataS3.push({ time: resultTime, value: parsedData.sensor3 })
          SensorStore.chartDataS4.push({ time: resultTime, value: parsedData.sensor4 })
          SensorStore.chartDataS5.push({ time: resultTime, value: parsedData.sensor5 })
          SensorStore.chartDataS6.push({ time: resultTime, value: parsedData.sensor6 })
          SensorStore.chartDataS7.push({ time: resultTime, value: parsedData.sensor7 })
          SensorStore.chartDataS8.push({ time: resultTime, value: parsedData.sensor8 })
          SensorStore.thistime = parsedData.time
        }
      } catch (error) {
        console.error("Error parsing WebSocket data:", error)
      }
    })

    socket.addEventListener("close", (event) => {
      console.log("WebSocket 连接已关闭:", event)
      // 断开后尝试重连
      reconnectWebSocket()
    })

    socket.addEventListener("error", (event) => {
      console.error("WebSocket 错误:", event)
      // 遇到错误后也尝试重连
      reconnectWebSocket()
    })
  }
}
const reconnectWebSocket = () => {
  if (reconnectAttempts.value < 5) {
    reconnectAttempts.value++
    console.log(`WebSocket 尝试重连 (${reconnectAttempts.value}) 次...`)
    setTimeout(() => {
      connectWebSocket()
    }, 500) // 等待时间
  } else {
    console.log("WebSocket 连接失败，已超过最大重连次数")
  }
}

// 模拟随机变化的 vno 和 bridge 数据
// function generateRandomData() {
//   const light = Math.random() < 0.5 ? 0 : 1
//   const gate = Math.random() < 0.5 ? 0 : 1
//   const dePedest = Math.random() < 0.5 ? 0 : 1
//   const opened = Math.random() < 0.5 ? 0 : 1
//   const randomVno = Array.from({ length: 5 }, () => Math.floor(Math.random() * 100).toString())
//   // const randomBridge = `Bridge-${Math.floor(Math.random() * 10)}`

//   return { vno: randomVno, light, gate, dePedest, opened }
// }
// // 每隔3秒发送模拟数据
// let intervalId

// function startInterval() {
//   // 若已有定时器存在，先清除旧定时器（避免重复创建）
//   if (intervalId) {
//     clearInterval(intervalId)
//   }

//   // 创建新定时器，并将ID赋值给变量
//   intervalId = setInterval(() => {
//     const randomData = generateRandomData()
//     console.log("每隔3秒发送模拟数据")

//     if (socket) {
//       const simulatedEvent = new MessageEvent("message", {
//         data: JSON.stringify({
//           type: "reminder",
//           time: 0,
//           state: 1,
//           light: randomData.light,
//           gate: randomData.gate,
//           deVessel: 1,
//           dePedest: randomData.dePedest,
//           opened: randomData.opened,
//           vno: randomData.vno,
//           bridge: "MB1"
//         })
//       })
//       socket.dispatchEvent(simulatedEvent)
//     }
//   }, 3000)
// }

relinkws()
// 控制弹窗的显示状态
const isModalVisibleLB1_15 = ref(false)
const isModalVisibleLB1_10_0 = ref(false)
const isModalVisibleLB1_10_1 = ref(false) //
const isModalVisibleLB1_5 = ref(false) //
const isModalVisibleLB1_0 = ref(false)
const isModalVisibleLB1__5 = ref(false) //
const isModalVisibleMB1_15 = ref(false)
const isModalVisibleMB1_10_0 = ref(false)
const isModalVisibleMB1_10_1 = ref(false)
const isModalVisibleMB1_5 = ref(false)
const isModalVisibleMB1_0 = ref(false)
const isModalVisibleMB1__5 = ref(false)
const isModalVisibleMB2_15 = ref(false)
const isModalVisibleMB2_10_0 = ref(false)
const isModalVisibleMB2_10_1 = ref(false)
const isModalVisibleMB2_5 = ref(false)
const isModalVisibleMB2_0 = ref(false)
const isModalVisibleMB2__5 = ref(false)

// 显示弹窗的函数 time = 5 10 15的时候用的

const showModalLB1_15 = () => {
  isModalVisibleLB1_15.value = true
}
const showModalLB1_10_0 = () => {
  isModalVisibleLB1_10_0.value = true
}
const showModalLB1_10_1 = () => {
  isModalVisibleLB1_10_1.value = true
}
const showModalLB1_5 = () => {
  isModalVisibleLB1_5.value = true
}
const showModalLB1_0 = () => {
  isModalVisibleLB1_0.value = true
}
const showModalLB1__5 = () => {
  isModalVisibleLB1__5.value = true
}

const showModalMB1_15 = () => {
  isModalVisibleMB1_15.value = true
}
const showModalMB1_10_0 = () => {
  isModalVisibleMB1_10_0.value = true
}
const showModalMB1_10_1 = () => {
  isModalVisibleMB1_10_1.value = true
}
const showModalMB1_5 = () => {
  isModalVisibleMB1_5.value = true
}
const showModalMB1_0 = () => {
  isModalVisibleMB1_0.value = true
}
const showModalMB1__5 = () => {
  isModalVisibleMB1__5.value = true
}

const showModalMB2_15 = () => {
  isModalVisibleMB2_15.value = true
}
const showModalMB2_10_0 = () => {
  isModalVisibleMB2_10_0.value = true
}
const showModalMB2_10_1 = () => {
  isModalVisibleMB2_10_1.value = true
}
const showModalMB2_5 = () => {
  isModalVisibleMB2_5.value = true
}
const showModalMB2_0 = () => {
  isModalVisibleMB2_0.value = true
}
const showModalMB2__5 = () => {
  isModalVisibleMB2__5.value = true
}

// 确认提醒的操作逻辑 弹窗关闭停止更新confirm按钮
const confirmReminderLB1 = () => {
  // isModalVisibleLB1_10_1.value = false
  // 执行确认的逻辑，比如提交提醒或进行下一步操作
  console.log("提醒已确认")
  // 向后端发送弹窗关闭停止更新api
  StopUpdateApi({
    time: LB1ReminderStore.LB1ReminderTime,
    bridge: LB1ReminderStore.LB1ReminderBridge
  }).then((response: any) => {
    console.log("StopUpdateApi调用结果: ", response.data)
  })
}
const confirmReminderMB1 = () => {
  // isModalVisibleLB1_10_1.value = false
  // 执行确认的逻辑，比如提交提醒或进行下一步操作
  console.log("提醒已确认")
  // 向后端发送弹窗关闭停止更新api
  StopUpdateApi({
    time: MB1ReminderStore.MB1ReminderTime,
    bridge: MB1ReminderStore.MB1ReminderBridge
  }).then((response: any) => {
    console.log("StopUpdateApi调用结果: ", response.data)
  })
}
const confirmReminderMB2 = () => {
  // isModalVisibleLB1_10_1.value = false
  // 执行确认的逻辑，比如提交提醒或进行下一步操作
  console.log("提醒已确认")
  // 向后端发送弹窗关闭停止更新api
  StopUpdateApi({
    time: MB2ReminderStore.MB2ReminderTime,
    bridge: MB2ReminderStore.MB2ReminderBridge
  }).then((response: any) => {
    console.log("StopUpdateApi调用结果: ", response.data)
  })
}

// 取消船只预约并通知用
const CancelBookLB1 = () => {
  console.log(typeof LB1ReminderStore.LB1ReminderVnoUnPass)
  CancelBookApi({
    vno: LB1ReminderStore.LB1ReminderVnoUnPass
  }).then((response: any) => {
    console.log("CancelBookApi调用结果：", response.message)
    ElMessage({
      message: "Send successfully.",
      type: "success"
    })
  })
}
const CancelBookMB1 = () => {
  CancelBookApi({
    vno: MB1ReminderStore.MB1ReminderVnoUnPass
  }).then((response: any) => {
    console.log("CancelBookApi调用结果：", response.message)
    ElMessage({
      message: "Send successfully.",
      type: "success"
    })
  })
}
const CancelBookMB2 = () => {
  CancelBookApi({
    vno: MB2ReminderStore.MB2ReminderVnoUnPass
  }).then((response: any) => {
    console.log("CancelBookApi调用结果：", response.message)
    ElMessage({
      message: "Send successfully.",
      type: "success"
    })
  })
}

// 等待 10 分钟的操作逻辑
const waitTenMinutesLB1 = () => {
  // isModalVisibleLB1_10_1.value = false
  // 执行等待 10 分钟的逻辑，比如设置一个定时器或其他业务逻辑
  Wait10minApi({
    type: LB1ReminderStore.LB1ReminderType,
    time: LB1ReminderStore.LB1ReminderTime,
    state: LB1ReminderStore.LB1ReminderDeVesselPass,
    vno: LB1ReminderStore.LB1ReminderVnoPass,
    bridge: LB1ReminderStore.LB1ReminderBridge
  }).then((response: any) => {
    console.log(response.message)
  })
  setTimeout(
    () => {
      console.log("等待 10 分钟结束")
      // 这里可以重新显示弹窗或执行其他逻辑
    },
    10 * 60 * 1000
  ) // 10 分钟
}
const waitTenMinutesMB1 = () => {
  // isModalVisibleLB1_10_1.value = false
  // 执行等待 10 分钟的逻辑，比如设置一个定时器或其他业务逻辑
  Wait10minApi({
    type: MB1ReminderStore.MB1ReminderType,
    time: MB1ReminderStore.MB1ReminderTime,
    state: MB1ReminderStore.MB1ReminderDeVesselPass,
    vno: MB1ReminderStore.MB1ReminderVnoPass,
    bridge: MB1ReminderStore.MB1ReminderBridge
  }).then((response: any) => {
    console.log(response.message)
  })
  setTimeout(
    () => {
      console.log("等待 10 分钟结束")
      // 这里可以重新显示弹窗或执行其他逻辑
    },
    10 * 60 * 1000
  ) // 10 分钟
}
const waitTenMinutesMB2 = () => {
  // isModalVisibleLB1_10_1.value = false
  // 执行等待 10 分钟的逻辑，比如设置一个定时器或其他业务逻辑
  Wait10minApi({
    type: MB2ReminderStore.MB2ReminderType,
    time: MB2ReminderStore.MB2ReminderTime,
    state: MB2ReminderStore.MB2ReminderDeVesselPass,
    vno: MB2ReminderStore.MB2ReminderVnoPass,
    bridge: MB2ReminderStore.MB2ReminderBridge
  }).then((response: any) => {
    console.log(response.message)
  })
  setTimeout(
    () => {
      console.log("等待 10 分钟结束")
      // 这里可以重新显示弹窗或执行其他逻辑
    },
    10 * 60 * 1000
  ) // 10 分钟
}

// 开合桥已准备完毕，向船只发送可通行提示 并且 点击之后，会跳转到sensor页面 还要加上 弹窗关闭停止更新操作
const SendtovesselsLB10 = () => {
  console.log("SendtovesselsLB10")
  // 向船只发送可通行提示API
  SendPassInfoApi(LB1ReminderStore.LB1ReminderBridge).then((response: any) => {
    console.log(LB1ReminderStore.LB1ReminderBridge, response.data)
    ElMessage({
      message: "Send successfully.",
      type: "success"
    })
  })

  // 关闭弹窗
  isModalVisibleLB1_0.value = false
  // 跳转到目标页面
  router.push({ path: "/Monitoring/Sensor" })
  // 向后端发送弹窗关闭停止更新api
  StopUpdateApi({
    time: LB1ReminderStore.LB1ReminderTime,
    bridge: LB1ReminderStore.LB1ReminderBridge
  }).then((response: any) => {
    console.log("StopUpdateApi调用结果: ", response.data)
  })
}
const SendtovesselsMB10 = () => {
  console.log("SendtovesselsMB10")
  // 向船只发送可通行提示API
  SendPassInfoApi(MB1ReminderStore.MB1ReminderBridge).then((response: any) => {
    console.log(MB1ReminderStore.MB1ReminderBridge, response.data)
    ElMessage({
      message: "Send successfully.",
      type: "success"
    })
  })

  // 关闭弹窗
  isModalVisibleMB1_0.value = false
  // 跳转到目标页面
  router.push({ path: "/Monitoring/Sensor" })
  // 向后端发送弹窗关闭停止更新api
  StopUpdateApi({
    time: MB1ReminderStore.MB1ReminderTime,
    bridge: MB1ReminderStore.MB1ReminderBridge
  }).then((response: any) => {
    console.log("StopUpdateApi调用结果: ", response.data)
  })
}
const SendtovesselsMB20 = () => {
  console.log("SendtovesselsMB20")
  // 向船只发送可通行提示API
  SendPassInfoApi(MB2ReminderStore.MB2ReminderBridge).then((response: any) => {
    console.log(MB2ReminderStore.MB2ReminderBridge, response.data)
    ElMessage({
      message: "Send successfully.",
      type: "success"
    })
  })

  // 关闭弹窗
  isModalVisibleMB2_0.value = false
  // 跳转到目标页面
  router.push({ path: "/Monitoring/Sensor" })
  // 向后端发送弹窗关闭停止更新api
  StopUpdateApi({
    time: MB2ReminderStore.MB2ReminderTime,
    bridge: MB2ReminderStore.MB2ReminderBridge
  }).then((response: any) => {
    console.log("StopUpdateApi调用结果: ", response.data)
  })
}
</script>

<template>
  <div>
    <el-config-provider>
      <router-view />
    </el-config-provider>

    <!-- 弹窗 -->
    <!-- LB1的弹窗 -->
    <div v-if="isModalVisibleLB1_15" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          After {{ LB1ReminderStore.LB1ReminderTime }} minutes, the {{ LB1ReminderStore.LB1ReminderBridge }} bridge
          needs to be opened.
        </p>
        <p v-if="LB1ReminderStore.LB1ReminderOpenedPass === 1">Current Status: Bridge is open</p>
        <p v-else>Current Status: Bridge is closed</p>
        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="isModalVisibleLB1_15 = false">Confirm</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleLB1_10_0" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          Please note, after {{ LB1ReminderStore.LB1ReminderTime }} minutes, the
          {{ LB1ReminderStore.LB1ReminderBridge }} bridge needs to be opened. <br />
          Whether the target vessel appears in the waiting area:
          <el-tag type="warning">not appeared</el-tag>
          <br />The related vessels' VNO: {{ LB1ReminderStore.LB1ReminderVnoUnPass.join(", ") }} <br />
          <span>The appointment has been canceled.</span>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="CancelBookLB1(), (isModalVisibleLB1_10_0 = false)">Confirm and Send</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleLB1_10_1" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          Please note, after {{ LB1ReminderStore.LB1ReminderTime }} minutes, the
          {{ LB1ReminderStore.LB1ReminderBridge }} bridge needs to be opened. <br />
          <br />The related vessels' VNO: {{ LB1ReminderStore.LB1ReminderVnoPass.join(", ") }} <br />
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Target vessel has appeared in the waiting area:
          <el-tag type="success">arrived</el-tag>
        </p>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="LB1ReminderStore.LB1ReminderLightPass === 1" type="warning">Green Light</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderLightPass === 0" type="success">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="LB1ReminderStore.LB1ReminderGatePass === 1" type="warning">Open</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderGatePass === 0" type="success">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="LB1ReminderStore.LB1ReminderDePedestPass === 1" type="warning">Yes</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderDePedestPass === 0" type="success">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="LB1ReminderStore.LB1ReminderOpenedPass === 1" type="warning">Open</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderOpenedPass === 0" type="success">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderLB1(), (isModalVisibleLB1_10_1 = false)" class="tanButton">Confirm</button>
          <button @click="waitTenMinutesLB1(), (isModalVisibleLB1_10_1 = false)" class="tanButton">
            Wait 10 minutes
          </button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleLB1_5" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          There are {{ LB1ReminderStore.LB1ReminderTime }} minutes left, and you can start working on the
          {{ LB1ReminderStore.LB1ReminderBridge }} bridge-related tasks.
          <br />
          <br />The related vessels' VNO: {{ LB1ReminderStore.LB1ReminderVnoPass.join(", ") }} <br />
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Target vessel has appeared in the waiting area:
          <el-tag type="success">arrived</el-tag>
        </p>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="LB1ReminderStore.LB1ReminderLightPass === 1" type="warning">Green Light</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderLightPass === 0" type="success">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="LB1ReminderStore.LB1ReminderGatePass === 1" type="warning">Open</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderGatePass === 0" type="success">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="LB1ReminderStore.LB1ReminderDePedestPass === 1" type="warning">Yes</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderDePedestPass === 0" type="success">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="LB1ReminderStore.LB1ReminderOpenedPass === 1" type="success">Open</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderOpenedPass === 0" type="warning">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderLB1(), (isModalVisibleLB1_5 = false)" class="tanButton">Confirm</button>
          <button @click="waitTenMinutesLB1(), (isModalVisibleLB1_5 = false)" class="tanButton">Wait 10 minutes</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleLB1_0" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p v-if="LB1ReminderStore.LB1ReminderOpenedPass === 1">
          {{ LB1ReminderStore.LB1ReminderBridge }} bridge is ready. Please send a passable notification to the vessels.
          <br />
          <span>After clicking, you will jump to the sensor page</span>
        </p>
        <p v-else>{{ LB1ReminderStore.LB1ReminderBridge }} bridge is not ready</p>
        <!-- Action buttons -->
        <div class="SendButton">
          <button v-if="LB1ReminderStore.LB1ReminderOpenedPass === 1" @click="SendtovesselsLB10">Send</button>
          <button v-else @click="isModalVisibleLB1_0 = false">Confirm</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleLB1__5" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          The vessel has passed completely, please close the bridge {{ LB1ReminderStore.LB1ReminderBridge }}.
          <br />
          <!-- The related vessels' VNO: {{ LB1ReminderStore.LB1ReminderVnoPass.join(", ") }} <br /> -->
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="LB1ReminderStore.LB1ReminderLightPass === 1" type="success">Green Light</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderLightPass === 0" type="warning">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="LB1ReminderStore.LB1ReminderGatePass === 1" type="success">Open</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderGatePass === 0" type="warning">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="LB1ReminderStore.LB1ReminderDePedestPass === 1" type="success">Yes</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderDePedestPass === 0" type="warning">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="LB1ReminderStore.LB1ReminderOpenedPass === 1" type="warning">Open</el-tag>
          <el-tag v-if="LB1ReminderStore.LB1ReminderOpenedPass === 0" type="success">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderLB1(), (isModalVisibleLB1__5 = false)" class="tanButton">Confirm</button>
          <h4
            v-if="
              LB1ReminderStore.LB1ReminderOpenedPass === 0 &&
              LB1ReminderStore.LB1ReminderGatePass === 1 &&
              LB1ReminderStore.LB1ReminderLightPass === 1
            "
          >
            Traffic has resumed.
          </h4>
          <!-- <button @click="waitTenMinutesLB1(), (isModalVisibleLB1__5 = false)" class="tanButton">Wait 10 minutes</button> -->
        </div>
      </div>
    </div>

    <!-- MB1的弹窗 -->
    <div v-if="isModalVisibleMB1_15" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          After {{ MB1ReminderStore.MB1ReminderTime }} minutes, the {{ MB1ReminderStore.MB1ReminderBridge }} bridge
          needs to be opened.
        </p>
        <p v-if="MB1ReminderStore.MB1ReminderOpenedPass === 1">Current Status: Bridge is open</p>
        <p v-else>Current Status: Bridge is closed</p>
        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="isModalVisibleMB1_15 = false">Confirm</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB1_10_0" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          Please note, after {{ MB1ReminderStore.MB1ReminderTime }} minutes, the
          {{ MB1ReminderStore.MB1ReminderBridge }} bridge needs to be opened. <br />
          Whether the target vessel appears in the waiting area:
          <el-tag type="warning">not appeared</el-tag>
          <br />The related vessels' VNO: {{ MB1ReminderStore.MB1ReminderVnoUnPass.join(", ") }} <br />
          <span>The appointment has been canceled.</span>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="CancelBookMB1(), (isModalVisibleMB1_10_0 = false)">Confirm and Send</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB1_10_1" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          Please note, after {{ MB1ReminderStore.MB1ReminderTime }} minutes, the
          {{ MB1ReminderStore.MB1ReminderBridge }} bridge needs to be opened. <br />
          <br />The related vessels' VNO: {{ MB1ReminderStore.MB1ReminderVnoPass.join(", ") }} <br />
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Target vessel has appeared in the waiting area:
          <el-tag type="success">arrived</el-tag>
        </p>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="MB1ReminderStore.MB1ReminderLightPass === 1" type="warning">Green Light</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderLightPass === 0" type="success">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="MB1ReminderStore.MB1ReminderGatePass === 1" type="warning">Open</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderGatePass === 0" type="success">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="MB1ReminderStore.MB1ReminderDePedestPass === 1" type="warning">Yes</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderDePedestPass === 0" type="success">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="MB1ReminderStore.MB1ReminderOpenedPass === 1" type="warning">Open</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderOpenedPass === 0" type="success">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderMB1(), (isModalVisibleMB1_10_1 = false)" class="tanButton">Confirm</button>
          <button @click="waitTenMinutesMB1(), (isModalVisibleMB1_10_1 = false)" class="tanButton">
            Wait 10 minutes
          </button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB1_5" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          There are {{ MB1ReminderStore.MB1ReminderTime }} minutes left, and you can start working on the
          {{ MB1ReminderStore.MB1ReminderBridge }} bridge-related tasks.
          <br />
          <br />The related vessels' VNO: {{ MB1ReminderStore.MB1ReminderVnoPass.join(", ") }} <br />
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Target vessel has appeared in the waiting area:
          <el-tag type="success">arrived</el-tag>
        </p>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="MB1ReminderStore.MB1ReminderLightPass === 1" type="warning">Green Light</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderLightPass === 0" type="success">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="MB1ReminderStore.MB1ReminderGatePass === 1" type="warning">Open</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderGatePass === 0" type="success">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="MB1ReminderStore.MB1ReminderDePedestPass === 1" type="warning">Yes</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderDePedestPass === 0" type="success">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="MB1ReminderStore.MB1ReminderOpenedPass === 1" type="success">Open</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderOpenedPass === 0" type="warning">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderMB1(), (isModalVisibleMB1_5 = false)" class="tanButton">Confirm</button>
          <button @click="waitTenMinutesMB1(), (isModalVisibleMB1_5 = false)" class="tanButton">Wait 10 minutes</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB1_0" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p v-if="MB1ReminderStore.MB1ReminderOpenedPass === 1">
          {{ MB1ReminderStore.MB1ReminderBridge }} bridge is ready. Please send a passable notification to the vessels.
          <br />
          <span>After clicking, you will jump to the sensor page</span>
        </p>
        <p v-else>{{ MB1ReminderStore.MB1ReminderBridge }} bridge is not ready</p>
        <!-- Action buttons -->
        <div class="SendButton">
          <button v-if="MB1ReminderStore.MB1ReminderOpenedPass === 1" @click="SendtovesselsMB10">Send</button>
          <button v-else @click="isModalVisibleMB1_0 = false">Confirm</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB1__5" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          The vessel has passed completely, please close the bridge {{ MB1ReminderStore.MB1ReminderBridge }}.
          <br />
          <!-- The related vessels' VNO: {{ MB1ReminderStore.MB1ReminderVnoPass.join(", ") }} <br /> -->
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="MB1ReminderStore.MB1ReminderLightPass === 1" type="success">Green Light</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderLightPass === 0" type="warning">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="MB1ReminderStore.MB1ReminderGatePass === 1" type="success">Open</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderGatePass === 0" type="warning">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="MB1ReminderStore.MB1ReminderDePedestPass === 1" type="success">Yes</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderDePedestPass === 0" type="warning">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="MB1ReminderStore.MB1ReminderOpenedPass === 1" type="warning">Open</el-tag>
          <el-tag v-if="MB1ReminderStore.MB1ReminderOpenedPass === 0" type="success">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderMB1(), (isModalVisibleMB1__5 = false)" class="tanButton">Confirm</button>
          <h4
            v-if="
              MB1ReminderStore.MB1ReminderOpenedPass === 0 &&
              MB1ReminderStore.MB1ReminderGatePass === 1 &&
              MB1ReminderStore.MB1ReminderLightPass === 1
            "
          >
            Traffic has resumed.
          </h4>
          <!-- <button @click="waitTenMinutesMB1(), (isModalVisibleMB1__5 = false)" class="tanButton">Wait 10 minutes</button> -->
        </div>
      </div>
    </div>

    <!-- MB2的弹窗 -->
    <div v-if="isModalVisibleMB2_15" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          After {{ MB2ReminderStore.MB2ReminderTime }} minutes, the {{ MB2ReminderStore.MB2ReminderBridge }} bridge
          needs to be opened.
        </p>
        <p v-if="MB2ReminderStore.MB2ReminderOpenedPass === 1">Current Status: Bridge is open</p>
        <p v-else>Current Status: Bridge is closed</p>
        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="isModalVisibleMB2_15 = false">Confirm</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB2_10_0" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          Please note, after {{ MB2ReminderStore.MB2ReminderTime }} minutes, the
          {{ MB2ReminderStore.MB2ReminderBridge }} bridge needs to be opened. <br />
          Whether the target vessel appears in the waiting area:
          <el-tag type="warning">not appeared</el-tag>
          <br />The related vessels' VNO: {{ MB2ReminderStore.MB2ReminderVnoUnPass.join(", ") }} <br />
          <span>The appointment has been canceled.</span>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="CancelBookMB2(), (isModalVisibleMB2_10_0 = false)">Confirm and Send</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB2_10_1" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          Please note, after {{ MB2ReminderStore.MB2ReminderTime }} minutes, the
          {{ MB2ReminderStore.MB2ReminderBridge }} bridge needs to be opened. <br />
          <br />The related vessels' VNO: {{ MB2ReminderStore.MB2ReminderVnoPass.join(", ") }} <br />
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Target vessel has appeared in the waiting area:
          <el-tag type="success">arrived</el-tag>
        </p>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="MB2ReminderStore.MB2ReminderLightPass === 1" type="warning">Green Light</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderLightPass === 0" type="success">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="MB2ReminderStore.MB2ReminderGatePass === 1" type="warning">Open</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderGatePass === 0" type="success">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="MB2ReminderStore.MB2ReminderDePedestPass === 1" type="warning">Yes</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderDePedestPass === 0" type="success">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="MB2ReminderStore.MB2ReminderOpenedPass === 1" type="warning">Open</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderOpenedPass === 0" type="success">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderMB2(), (isModalVisibleMB2_10_1 = false)" class="tanButton">Confirm</button>
          <button @click="waitTenMinutesMB2(), (isModalVisibleMB2_10_1 = false)" class="tanButton">
            Wait 10 minutes
          </button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB2_5" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          There are {{ MB2ReminderStore.MB2ReminderTime }} minutes left, and you can start working on the
          {{ MB2ReminderStore.MB2ReminderBridge }} bridge-related tasks.
          <br />
          <br />The related vessels' VNO: {{ MB2ReminderStore.MB2ReminderVnoPass.join(", ") }} <br />
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Target vessel has appeared in the waiting area:
          <el-tag type="success">arrived</el-tag>
        </p>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="MB2ReminderStore.MB2ReminderLightPass === 1" type="warning">Green Light</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderLightPass === 0" type="success">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="MB2ReminderStore.MB2ReminderGatePass === 1" type="warning">Open</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderGatePass === 0" type="success">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="MB2ReminderStore.MB2ReminderDePedestPass === 1" type="warning">Yes</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderDePedestPass === 0" type="success">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="MB2ReminderStore.MB2ReminderOpenedPass === 1" type="success">Open</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderOpenedPass === 0" type="warning">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderMB2(), (isModalVisibleMB2_5 = false)" class="tanButton">Confirm</button>
          <button @click="waitTenMinutesMB2(), (isModalVisibleMB2_5 = false)" class="tanButton">Wait 10 minutes</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB2_0" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p v-if="MB2ReminderStore.MB2ReminderOpenedPass === 1">
          {{ MB2ReminderStore.MB2ReminderBridge }} bridge is ready. Please send a passable notification to the vessels.
          <br />
          <span>After clicking, you will jump to the sensor page</span>
        </p>
        <p v-else>{{ MB2ReminderStore.MB2ReminderBridge }} bridge is not ready</p>
        <!-- Action buttons -->
        <div class="SendButton">
          <button v-if="MB2ReminderStore.MB2ReminderOpenedPass === 1" @click="SendtovesselsMB20">Send</button>
          <button v-else @click="isModalVisibleMB2_0 = false">Confirm</button>
        </div>
      </div>
    </div>
    <div v-if="isModalVisibleMB2__5" class="modal">
      <div class="modal-content">
        <h3 style="text-align: center">Reminder</h3>
        <!-- Display information -->
        <p>
          The vessel has passed completely, please close the bridge {{ MB2ReminderStore.MB2ReminderBridge }}.
          <br />
          <!-- The related vessels' VNO: {{ MB2ReminderStore.MB2ReminderVnoPass.join(", ") }} <br /> -->
        </p>
        <hr />
        <span>Status information is as follows:</span>
        <p>
          Pedestrian traffic light:
          <el-tag v-if="MB2ReminderStore.MB2ReminderLightPass === 1" type="success">Green Light</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderLightPass === 0" type="warning">red Light</el-tag>
        </p>
        <p>
          Pedestrian traffic gate:
          <el-tag v-if="MB2ReminderStore.MB2ReminderGatePass === 1" type="success">Open</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderGatePass === 0" type="warning">Close</el-tag>
        </p>
        <p>
          Is there any detection of personnel on the bridge:
          <el-tag v-if="MB2ReminderStore.MB2ReminderDePedestPass === 1" type="success">Yes</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderDePedestPass === 0" type="warning">No</el-tag>
        </p>
        <p>
          The current bridge status:
          <el-tag v-if="MB2ReminderStore.MB2ReminderOpenedPass === 1" type="warning">Open</el-tag>
          <el-tag v-if="MB2ReminderStore.MB2ReminderOpenedPass === 0" type="success">Close</el-tag>
        </p>

        <!-- Action buttons -->
        <div class="SendButton">
          <button @click="confirmReminderMB2(), (isModalVisibleMB2__5 = false)" class="tanButton">Confirm</button>
          <h4
            v-if="
              MB2ReminderStore.MB2ReminderOpenedPass === 0 &&
              MB2ReminderStore.MB2ReminderGatePass === 1 &&
              MB2ReminderStore.MB2ReminderLightPass === 1
            "
          >
            Traffic has resumed.
          </h4>
          <!-- <button @click="waitTenMinutesMB2(), (isModalVisibleMB2__5 = false)" class="tanButton">Wait 10 minutes</button> -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.SendButton {
  text-align: center;
}
.modal {
  z-index: 9999;
  position: fixed; /* 确保弹窗始终悬浮在页面上 */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 360px;
  font-size: large;
  line-height: 1.35;
}

.tanButton {
  margin: 10px;
}
</style>
