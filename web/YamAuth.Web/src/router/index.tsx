import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'

const BasicLayout = lazy(() => import('@/layouts/BasicLayout'))
const Login = lazy(() => import('@/pages/Login'))
const Home = lazy(() => import('@/pages/Home'))
const ProfilePage = lazy(() => import('@/pages/Account/ProfilePage'))
const AdministratorsPage = lazy(() => import('@/pages/Account/AdministratorsPage'))
const AuditPage = lazy(() => import('@/pages/Account/AuditPage'))
const CrudPage = lazy(() => import('@/pages/Crud'))

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'account', element: <ProfilePage /> },
      { path: 'auth/administrators', element: <AdministratorsPage /> },
      { path: 'auth/audit', element: <AuditPage /> },
      { path: '*', element: <CrudPage /> }
    ]
  }
]
