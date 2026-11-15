import type { RelationLabels } from './access'
import type { PagedQuery } from './api'

/** Bzss 传输契约：与后端 DTO 对齐；日期为 JSON 字符串，可空属性仍会出现在响应中。 */
export interface CompanyDto {
  id: number
  tenantId: number | null
  nameCn: string | null
  nameEn: string | null
  registratioNo: string | null
  legalName: string | null
  countryId: number | null
  regDate: string | null
  classify: number | null
  currency: string | null
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
  ownerUserId: number | null
  ownerDepartmentId: number | null
  rowVersion: string
  allowedActions: string[]
  relatedLabels: RelationLabels
}

export interface CompanyCreateDto {
  nameCn: string | null
  nameEn: string | null
  registratioNo: string | null
  legalName: string | null
  countryId: number | null
  regDate: string | null
  classify: number | null
  currency: string | null
  remark: string | null
  ownerUserId: number | null
  ownerDepartmentId: number | null
}

export interface CompanyUpdateDto {
  nameCn: string | null
  nameEn: string | null
  registratioNo: string | null
  legalName: string | null
  countryId: number | null
  regDate: string | null
  classify: number | null
  currency: string | null
  remark: string | null
}

export type CompanyQueryDto = PagedQuery

export interface ProjectDto {
  id: number
  tenantId: number | null
  projCode: string | null
  projName: string | null
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
  ownerUserId: number | null
  ownerDepartmentId: number | null
  rowVersion: string
  allowedActions: string[]
  relatedLabels: RelationLabels
}

export interface ProjectCreateDto {
  projCode: string | null
  projName: string | null
  remark: string | null
  ownerUserId: number | null
  ownerDepartmentId: number | null
}

export interface ProjectUpdateDto {
  projCode: string | null
  projName: string | null
  remark: string | null
}

export type ProjectQueryDto = PagedQuery
