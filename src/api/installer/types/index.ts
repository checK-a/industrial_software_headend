interface Component {
  id: number
  name: string
  version: string
  size: string
  description: string
  dynamicsDirection?: string
  moduleType: string
  resourceType?: string
  address: string
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export type { Component, ApiResponse }
