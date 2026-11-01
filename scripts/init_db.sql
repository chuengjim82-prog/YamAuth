-- ForgeAbc primary database (ForgeBase) schema — 12 surviving tables.
-- Each CREATE TABLE is guarded so the script is a safe no-op against an existing database.
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'dbo.tb_Auth_User', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Auth_User](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[UserName] [varchar](50) NOT NULL,
	[NickName] [varchar](50) NOT NULL,
	[Password] [varchar](250) NOT NULL,
	[PwdSalt] [varchar](250) NOT NULL,
	[Avatar] [varchar](250) NOT NULL,
	[Phone] [varchar](50) NOT NULL,
	[Email] [varchar](100) NOT NULL,
	[IsActived] [bit] NOT NULL,
	[Remark] [varchar](255) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
	[PermVersion] [int] NOT NULL CONSTRAINT [DF_Auth_User_PermVersion] DEFAULT ((1)),
 CONSTRAINT [PK_TB_AUTH_USER] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Auth_MenuGroup', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Auth_MenuGroup](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[GroupName] [varchar](50) NOT NULL,
	[SortIndex] [int] NOT NULL,
	[Remark] [varchar](255) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_AUTH_MENUGROUP] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Auth_MenuInfo', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Auth_MenuInfo](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[GroupId] [bigint] NOT NULL,
	[ParentId] [bigint] NOT NULL,
	[MenuIcon] [varchar](50) NOT NULL,
	[MenuName] [varchar](50) NOT NULL,
	[MenuType] [varchar](50) NOT NULL,
	[SortIndex] [int] NOT NULL,
	[MenuUrl] [varchar](250) NOT NULL,
	[AllowAny] [bit] NOT NULL,
	[IsHided] [bit] NOT NULL,
	[Remark] [varchar](255) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_AUTH_MENUINFO] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Auth_MenuItem', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Auth_MenuItem](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[MenuId] [bigint] NOT NULL,
	[ItemName] [varchar](50) NOT NULL,
	[ItemUrl] [varchar](250) NOT NULL,
	[SortIndex] [int] NOT NULL,
	[AllowAny] [bit] NOT NULL,
	[IsHided] [bit] NOT NULL,
	[Remark] [varchar](255) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_AUTH_MENUITEM] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Auth_MenuRole', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Auth_MenuRole](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[ParentId] [bigint] NOT NULL,
	[RoleName] [varchar](50) NOT NULL,
	[IsActived] [bit] NOT NULL,
	[Remark] [varchar](255) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_AUTH_MENUROLE] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Auth_MenuRoleMenu', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Auth_MenuRoleMenu](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[MenuRoleId] [bigint] NOT NULL,
	[MenuInfoId] [bigint] NOT NULL,
	[MenuItemId] [bigint] NOT NULL,
	[IsMenuItem] [bit] NOT NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [nvarchar](64) NULL,
	[UpdateTime] [datetime2](7) NULL,
 CONSTRAINT [PK_TB_AUTH_MENUROLEMENU] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Auth_MenuRoleUser', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Auth_MenuRoleUser](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[RoleId] [bigint] NOT NULL,
	[UserId] [bigint] NOT NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [nvarchar](64) NULL,
	[UpdateTime] [datetime2](7) NULL,
 CONSTRAINT [PK_TB_AUTH_MENUROLEUSER] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Base_Country', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Base_Country](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[Code2] [varchar](50) NOT NULL,
	[Code3] [varchar](50) NOT NULL,
	[CnName] [varchar](100) NOT NULL,
	[EnName] [varchar](200) NOT NULL,
	[Currency] [varchar](50) NOT NULL,
	[TimeZone] [int] NOT NULL,
	[Remark] [varchar](255) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_BASE_COUNTRY] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Base_Currency', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Base_Currency](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[Code] [varchar](50) NOT NULL,
	[Name] [varchar](100) NOT NULL,
	[Symbol] [nvarchar](50) NOT NULL,
	[Remark] [varchar](255) NOT NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_BASE_CURRENCY] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Base_Customer', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Base_Customer](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[Code] [varchar](50) NOT NULL,
	[Name] [varchar](50) NOT NULL,
	[CountryId] [bigint] NULL,
	[CityName] [varchar](50) NULL,
	[SaleMan] [varchar](50) NULL,
	[Contact] [varchar](50) NULL,
	[Phone] [varchar](50) NULL,
	[Address] [nvarchar](250) NULL,
	[IsActived] [bit] NULL,
	[Remark] [varchar](250) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_BASE_CUSTOMER] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Goods_SpuInfo', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Goods_SpuInfo](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[PrdCategory] [varchar](50) NOT NULL,
	[ProductType] [varchar](50) NOT NULL,
	[ProductTypeS] [varchar](50) NOT NULL,
	[Remark] [varchar](255) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
	[CustomerId] [bigint] NOT NULL CONSTRAINT [DF_Goods_SpuInfo_CustomerId] DEFAULT ((0)),
 CONSTRAINT [PK_TB_GOODS_SPUINFO] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Goods_SkcInfo', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Goods_SkcInfo](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CustomerId] [bigint] NOT NULL,
	[SpuId] [bigint] NOT NULL,
	[SkcCode] [varchar](100) NOT NULL,
	[BrandName] [varchar](100) NOT NULL,
	[PrdTitleCn] [varchar](250) NOT NULL,
	[PrdTitleEn] [varchar](250) NOT NULL,
	[PrdTitleLc] [nvarchar](250) NOT NULL,
	[ColorName] [varchar](50) NOT NULL,
	[Remark] [varchar](255) NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_GOODS_SKCINFO] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
IF OBJECT_ID(N'dbo.tb_Goods_SkuInfo', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Goods_SkuInfo](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CustomerId] [bigint] NOT NULL,
	[SpuId] [bigint] NOT NULL,
	[SkcId] [bigint] NOT NULL,
	[SkuCode] [varchar](100) NOT NULL,
	[BrandName] [varchar](100) NOT NULL,
	[PrdTitleCn] [varchar](250) NOT NULL,
	[PrdTitleEn] [varchar](250) NOT NULL,
	[PrdTitleLc] [nvarchar](250) NOT NULL,
	[ColorName] [varchar](50) NOT NULL,
	[SizeName] [varchar](50) NOT NULL,
	[ImageUrl] [varchar](250) NULL,
	[CostCcy] [varchar](50) NULL,
	[CostPrice] [decimal](18, 3) NULL,
	[SalePrice] [decimal](18, 3) NULL,
	[Remark] [varchar](255) NOT NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatorId] [bigint] NOT NULL,
	[CreatorNic] [varchar](50) NOT NULL,
	[CreateTime] [datetime] NOT NULL,
	[UpdaterId] [bigint] NULL,
	[UpdaterNic] [varchar](50) NULL,
	[UpdateTime] [datetime] NULL,
	[DeleterId] [bigint] NULL,
	[DeleterNic] [varchar](50) NULL,
	[DeleteTime] [datetime] NULL,
 CONSTRAINT [PK_TB_GOODS_SKUINFO] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
