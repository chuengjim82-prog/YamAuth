import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'

const BasicLayout = lazy(() => import('@/layouts/BasicLayout'))
const Login = lazy(() => import('@/pages/Login'))
const Home = lazy(() => import('@/pages/Home'))
const CrudPage = lazy(() => import('@/pages/Crud'))

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: '*', element: <CrudPage /> }
    ]
  }
]
