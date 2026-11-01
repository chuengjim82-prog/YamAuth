import { Navigate, type RouteObject } from 'react-router-dom'
import BasicLayout from '@/layouts/BasicLayout'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import CrudPage from '@/pages/Crud'

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <BasicLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: '*', element: <CrudPage /> },
    ],
  },
]
