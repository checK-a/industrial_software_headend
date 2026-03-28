// src/api/dataManagement/index.ts

import { request } from "@/utils/service"
import type { ApiResponse, FileItem, PageData } from "@/api/dataManagement/types/file"
import { getToken } from "@/utils/cache/cookies"
import axios from "axios"

// 数据库类型标识
export enum DbType {
  SimulationResult = "simulationResult",
  ExampleLibrary = "exampleLibrary",
  MaterialConstitutive = "materialConstitutive",
  ConnectionPerformance = "connectionPerformance",
  ModelLibrary = "modelLibrary",
  AircraftDummy = "aircraftDummy"
}

// 1. 获取文件列表接口
export function getFileListApi(params: {
  dbType: DbType
  pageNum: number
  pageSize: number
  keyword?: string
}): Promise<ApiResponse<PageData<FileItem>>> {
  return request<ApiResponse<PageData<FileItem>>>({
    url: "/dataManagement/files",
    method: "get",
    params
  })
}

// 2. 文件上传接口
export function uploadFileApi(data: FormData): Promise<ApiResponse<FileItem>> {
  return request<ApiResponse<FileItem>>({
    url: "/dataManagement/upload",
    method: "post",
    headers: {
      "Content-Type": "multipart/form-data"
    },
    data,
    timeout: 0
  })
}

// 3. 文件下载接口（返回完整响应，包含 headers）
export function downloadFileApi(params: { dbType: DbType; field: string }) {
  return axios.get("/dataManagement/download", {
    baseURL: import.meta.env.VITE_BASE_API,
    params,
    responseType: "blob",
    timeout: 0,
    headers: {
      Authorization: getToken() || ""
    }
  })
}

// 4. 删除文件接口 - 新增这个函数
export function deleteFileApi(params: { dbType: DbType; fileId: string }): Promise<ApiResponse<null>> {
  return request<ApiResponse<null>>({
    url: "/dataManagement/delete",
    method: "delete",
    params
  })
}
