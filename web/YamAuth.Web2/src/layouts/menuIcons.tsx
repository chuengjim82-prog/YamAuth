import type { ReactNode } from 'react'
import {
  ApiOutlined,
  AppstoreOutlined,
  BankOutlined,
  ContainerOutlined,
  DollarOutlined,
  FolderOutlined,
  IdcardOutlined,
  KeyOutlined,
  LockOutlined,
  MenuOutlined,
  ProfileOutlined,
  ReadOutlined,
  ShareAltOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons'

const icons: Record<string, ReactNode> = {
  Lock: <LockOutlined />,
  Briefcase: <ContainerOutlined />,
  OfficeBuilding: <BankOutlined />,
  User: <UserOutlined />,
  UserFilled: <UserOutlined />,
  Grid: <AppstoreOutlined />,
  Connection: <ApiOutlined />,
  List: <UnorderedListOutlined />,
  Tickets: <ProfileOutlined />,
  Menu: <MenuOutlined />,
  Key: <KeyOutlined />,
  Share: <ShareAltOutlined />,
  Coin: <DollarOutlined />,
  Avatar: <TeamOutlined />,
  Suitcase: <ShoppingOutlined />,
  Folder: <FolderOutlined />,
  School: <ReadOutlined />,
  Postcard: <IdcardOutlined />,
}

export function menuIcon(name?: string) {
  if (!name) return undefined
  return icons[name] ?? <AppstoreOutlined />
}
