import { createElement, type ReactElement } from 'react'
import ResourceCrudPage from './pages/Crud/ResourceCrudPage'
import type { Entity, ResourceDef, ResourcePageProps } from './resources/types'
import * as definitions from './resources/definitions'

interface ResourceRegistration {
  path: string
  title: string
  render: (props: ResourcePageProps) => ReactElement
}

/** 在注册时封闭具体业务类型，路由层无需把异构资源强转为同一种实体。 */
function bindResource<E extends Entity, F extends object, C, U>(
  resource: ResourceDef<E, F, C, U>
): ResourceRegistration {
  return {
    path: resource.path,
    title: resource.title,
    render: (props) => createElement(ResourceCrudPage<E, F, C, U>, { ...props, resource })
  }
}

export const resources: ResourceRegistration[] = [
  bindResource(definitions.userResource),
  bindResource(definitions.tenantResource),
  bindResource(definitions.appsInfoResource),
  bindResource(definitions.appsUserResource),
  bindResource(definitions.crudInfoResource),
  bindResource(definitions.crudItemResource),
  bindResource(definitions.crudMenuResource),
  bindResource(definitions.crudRoleResource),
  bindResource(definitions.crudRoleCrudResource),
  bindResource(definitions.crudRoleUserResource),
  bindResource(definitions.dataRoleResource),
  bindResource(definitions.dataRoleUserResource),
  bindResource(definitions.companyResource),
  bindResource(definitions.projectResource),
  bindResource(definitions.departmentResource),
  bindResource(definitions.employeeResource)
]

export function findResource(pathname: string) {
  return resources.find((item) => item.path === pathname)
}
