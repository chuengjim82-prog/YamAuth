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
  empCount: number | null
  directorId: number | null
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
    tenantId: values.tenantId ?? null,
    deptName: values.deptName,
    empCount: values.empCount ?? null,
    directorId: values.directorId ?? null,
    remark: values.remark
  }
}

export function departmentToUpdate(values: DepartmentForm): DepartmentUpdateDto {
  return {
    tenantId: values.tenantId ?? null,
    deptName: values.deptName,
    empCount: values.empCount ?? null,
    directorId: values.directorId ?? null,
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
    departmentId: values.departmentId ?? null,
    userId: values.userId ?? null,
    remark: values.remark
  }
}

export function employeeToUpdate(values: EmployeeForm): EmployeeUpdateDto {
  return {
    departmentId: values.departmentId ?? null,
    userId: values.userId ?? null,
    remark: values.remark
  }
}
