import type { IntegerInputValue } from '../formValues'
import dayjs, { type Dayjs } from 'dayjs'
import { FormValueError, nullableNumber } from '../formValues'
import type {
  CompanyDto,
  CompanyCreateDto,
  CompanyUpdateDto,
  ProjectDto,
  ProjectCreateDto,
  ProjectUpdateDto
} from '@/types/bzss'

/** 日期使用 Dayjs 编辑，由转换函数生成接口约定的字符串或 null。 */
export interface CompanyForm {
  tenantId: number | null
  nameCn: string
  nameEn: string
  registratioNo: string
  legalName: string
  countryId: IntegerInputValue
  regDate: Dayjs | null
  classify: IntegerInputValue
  currency: string
  remark: string
}

export function companyToForm(row?: CompanyDto): CompanyForm {
  return {
    tenantId: row?.tenantId ?? null,
    nameCn: row?.nameCn ?? '',
    nameEn: row?.nameEn ?? '',
    registratioNo: row?.registratioNo ?? '',
    legalName: row?.legalName ?? '',
    countryId: row?.countryId ?? null,
    regDate: row?.regDate ? dayjs(row.regDate) : null,
    classify: row?.classify ?? null,
    currency: row?.currency ?? '',
    remark: row?.remark ?? ''
  }
}

export function companyToCreate(values: CompanyForm): CompanyCreateDto {
  if (values.regDate && !values.regDate.isValid()) throw new FormValueError('注册日期无效')
  return {
    tenantId: nullableNumber(values.tenantId, '租户'),
    nameCn: values.nameCn,
    nameEn: values.nameEn,
    registratioNo: values.registratioNo,
    legalName: values.legalName,
    countryId: nullableNumber(values.countryId, '国家'),
    regDate: values.regDate ? values.regDate.format('YYYY-MM-DDTHH:mm:ss') : null,
    classify: nullableNumber(values.classify, '分类', 'int32'),
    currency: values.currency,
    remark: values.remark
  }
}

export function companyToUpdate(values: CompanyForm): CompanyUpdateDto {
  if (values.regDate && !values.regDate.isValid()) throw new FormValueError('注册日期无效')
  return {
    tenantId: nullableNumber(values.tenantId, '租户'),
    nameCn: values.nameCn,
    nameEn: values.nameEn,
    registratioNo: values.registratioNo,
    legalName: values.legalName,
    countryId: nullableNumber(values.countryId, '国家'),
    regDate: values.regDate ? values.regDate.format('YYYY-MM-DDTHH:mm:ss') : null,
    classify: nullableNumber(values.classify, '分类', 'int32'),
    currency: values.currency,
    remark: values.remark
  }
}

export interface ProjectForm {
  tenantId: number | null
  projCode: string
  projName: string
  remark: string
}

export function projectToForm(row?: ProjectDto): ProjectForm {
  return {
    tenantId: row?.tenantId ?? null,
    projCode: row?.projCode ?? '',
    projName: row?.projName ?? '',
    remark: row?.remark ?? ''
  }
}

export function projectToCreate(values: ProjectForm): ProjectCreateDto {
  return {
    tenantId: nullableNumber(values.tenantId, '租户'),
    projCode: values.projCode,
    projName: values.projName,
    remark: values.remark
  }
}

export function projectToUpdate(values: ProjectForm): ProjectUpdateDto {
  return {
    tenantId: nullableNumber(values.tenantId, '租户'),
    projCode: values.projCode,
    projName: values.projName,
    remark: values.remark
  }
}
