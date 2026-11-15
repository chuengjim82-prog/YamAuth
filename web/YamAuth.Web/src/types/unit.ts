import type { RelationLabels } from './access'
import type { PagedQuery } from './api'

/** Unit 传输契约：与后端 DTO 对齐；日期为 JSON 字符串，可空属性仍会出现在响应中。 */
export interface DepartmentDto {
  id: number
  tenantId: number | null
  deptName: string | null
  empCount: number | null
  directorId: number | null
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
  allowedActions: string[]
  relatedLabels: RelationLabels
}

export interface DepartmentCreateDto {
  deptName: string | null
  empCount: number | null
  directorId: number | null
  remark: string | null
}

export interface DepartmentUpdateDto {
  deptName: string | null
  empCount: number | null
  directorId: number | null
  remark: string | null
}

export type DepartmentQueryDto = PagedQuery

export interface EmployeeDto {
  id: number
  departmentId: number | null
  userId: number | null
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
  tenantId: number | null
  allowedActions: string[]
  relatedLabels: RelationLabels
}

export interface EmployeeCreateDto {
  departmentId: number | null
  userId: number | null
  remark: string | null
}

export interface EmployeeUpdateDto {
  remark: string | null
}

export type EmployeeQueryDto = PagedQuery
