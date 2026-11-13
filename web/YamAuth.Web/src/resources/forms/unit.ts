import type { IntegerInputValue } from '../formValues'
import { nullableNumber } from '../formValues'
import type {
  DepartmentDto,
  DepartmentCreateDto,
  DepartmentUpdateDto,
  EmployeeDto,
  EmployeeCreateDto,
  EmployeeUpdateDto
} from '@/types/unit'

export interface DepartmentForm {
  tenantId: number | null
  deptName: string
  empCount: IntegerInputValue
  directorId: IntegerInputValue
  remark: string
}

export function departmentToForm(row?: DepartmentDto): DepartmentForm {
  return {
    tenantId: row?.tenantId ?? null,
    deptName: row?.deptName ?? '',
    empCount: row?.empCount ?? null,
    directorId: row?.directorId ?? null,
    remark: row?.remark ?? ''
  }
}

export function departmentToCreate(values: DepartmentForm): DepartmentCreateDto {
  return {
    tenantId: nullableNumber(values.tenantId, '租户'),
    deptName: values.deptName,
    empCount: nullableNumber(values.empCount, '员工数', 'int32'),
    directorId: nullableNumber(values.directorId, '负责人'),
    remark: values.remark
  }
}

export function departmentToUpdate(values: DepartmentForm): DepartmentUpdateDto {
  return {
    tenantId: nullableNumber(values.tenantId, '租户'),
    deptName: values.deptName,
    empCount: nullableNumber(values.empCount, '员工数', 'int32'),
    directorId: nullableNumber(values.directorId, '负责人'),
    remark: values.remark
  }
}

export interface EmployeeForm {
  departmentId: number | null
  userId: number | null
  remark: string
}

export function employeeToForm(row?: EmployeeDto): EmployeeForm {
  return {
    departmentId: row?.departmentId ?? null,
    userId: row?.userId ?? null,
    remark: row?.remark ?? ''
  }
}

export function employeeToCreate(values: EmployeeForm): EmployeeCreateDto {
  return {
    departmentId: nullableNumber(values.departmentId, '部门'),
    userId: nullableNumber(values.userId, '用户'),
    remark: values.remark
  }
}

export function employeeToUpdate(values: EmployeeForm): EmployeeUpdateDto {
  return {
    departmentId: nullableNumber(values.departmentId, '部门'),
    userId: nullableNumber(values.userId, '用户'),
    remark: values.remark
  }
}
