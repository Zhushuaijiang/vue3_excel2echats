import { Store } from 'pinia'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $store: Store
  }
}

export interface FormField {
  name: string
  type: 'text' | 'number' | 'date' | 'select'
  options?: string[]
}

export interface FormConfig {
  id?: number
  name: string
  fields: FormField[]
  created_at?: string
}

export interface CargoRecord {
  id?: number
  config_id: number
  data: any
  created_at?: string
}

export interface DashboardWidget {
  id: string
  type: string
  title: string
  x: number
  y: number
  w: number
  h: number
  option: any
}

export interface AITemplate {
  id?: number
  name: string
  prompt: string
  created_at?: string
}

export {}

