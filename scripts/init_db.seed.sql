-- ForgeAbc minimal bootstrap seed: super-admin user, one menu group, and the kept menus.
-- Idempotent: guarded by IF NOT EXISTS so re-running is a no-op.
-- The admin password hash is patched to a real BCrypt value by ForgeAbc.DbInit.
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ---- Super-admin user (Id = 1) ----
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_User] WHERE [Id] = 1)
BEGIN
	SET IDENTITY_INSERT [dbo].[tb_Auth_User] ON;
	INSERT [dbo].[tb_Auth_User]
		([Id], [UserName], [NickName], [Password], [PwdSalt], [Avatar], [Phone], [Email], [IsActived], [Remark], [IsDeleted], [CreatorId], [CreatorNic], [CreateTime], [UpdaterId], [UpdaterNic], [UpdateTime], [DeleterId], [DeleterNic], [DeleteTime], [PermVersion])
	VALUES
		(1, N'admin', N'Administrator', N'$2a$11$placeholder.will.be.patched.by.DbInit.xxxxxxxxxxxxxxx', N'00000000000000000000000000000000', N'', N'', N'admin@local.dev', 1, N'Built-in administrator', 0, 0, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL, 1);
	SET IDENTITY_INSERT [dbo].[tb_Auth_User] OFF;
END
GO

-- ---- Menu group (Id = 1) ----
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuGroup] WHERE [Id] = 1)
BEGIN
	SET IDENTITY_INSERT [dbo].[tb_Auth_MenuGroup] ON;
	INSERT [dbo].[tb_Auth_MenuGroup]
		([Id], [GroupName], [SortIndex], [Remark], [IsDeleted], [CreatorId], [CreatorNic], [CreateTime], [UpdaterId], [UpdaterNic], [UpdateTime], [DeleterId], [DeleterNic], [DeleteTime])
	VALUES
		(1, N'Main', 1, N'', 0, 0, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
	SET IDENTITY_INSERT [dbo].[tb_Auth_MenuGroup] OFF;
END
GO

-- ---- Menus ----
SET IDENTITY_INSERT [dbo].[tb_Auth_MenuInfo] ON
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 5)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (5, 1, 0, N'HomeFilled', N'首页', N'page', 1, N'/home', 1, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 1)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (1, 1, 0, N'Lock', N'权限管理', N'directory', 10, N'', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 2)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (2, 1, 0, N'Document', N'基础数据', N'directory', 20, N'', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 3)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (3, 1, 0, N'Goods', N'商品管理', N'directory', 30, N'', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 4)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (4, 1, 0, N'Box', N'库存管理', N'directory', 40, N'', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 11)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (11, 1, 1, N'User', N'用户管理', N'page', 11, N'/auth/users', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 12)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (12, 1, 1, N'Menu', N'菜单管理', N'page', 12, N'/auth/menu-infos', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 13)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (13, 1, 1, N'Tools', N'菜单项', N'page', 13, N'/auth/menu-items', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 14)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (14, 1, 1, N'Avatar', N'角色管理', N'page', 14, N'/auth/menu-roles', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 45)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (45, 1, 1, N'', N'用户角色分配', N'page', 15, N'/auth/user-roles-assign', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 46)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (46, 1, 1, N'', N'角色菜单分配', N'page', 16, N'/auth/role-menus-assign', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 21)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (21, 1, 2, N'Location', N'国家', N'page', 21, N'/base/countries', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 22)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (22, 1, 2, N'Money', N'币种', N'page', 22, N'/base/currencies', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 23)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (23, 1, 2, N'User', N'客户', N'page', 23, N'/base/customers', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 31)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (31, 1, 3, N'Goods', N'SPU', N'page', 31, N'/goods/spu-infos', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 32)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (32, 1, 3, N'Goods', N'SKC', N'page', 32, N'/goods/skc-infos', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 34)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (34, 1, 3, N'Goods', N'SKU', N'page', 34, N'/goods/sku-infos', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
IF NOT EXISTS (SELECT 1 FROM [dbo].[tb_Auth_MenuInfo] WHERE [Id] = 41)
	INSERT [dbo].[tb_Auth_MenuInfo] ([Id],[GroupId],[ParentId],[MenuIcon],[MenuName],[MenuType],[SortIndex],[MenuUrl],[AllowAny],[IsHided],[Remark],[IsDeleted],[CreatorId],[CreatorNic],[CreateTime],[UpdaterId],[UpdaterNic],[UpdateTime],[DeleterId],[DeleterNic],[DeleteTime])
	VALUES (41, 1, 4, N'Box', N'SKU库存', N'page', 41, N'/stock/sku-stocks', 0, 0, N'', 0, 1, N'system', CAST(N'2026-01-01T00:00:00.000' AS DateTime), NULL, NULL, NULL, NULL, NULL, NULL);
GO
SET IDENTITY_INSERT [dbo].[tb_Auth_MenuInfo] OFF
GO
