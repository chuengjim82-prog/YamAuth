-- ForgeAbc secondary database (ForgeBzss) schema — only tb_Stock_SkuStock.
-- Guarded so the script is a safe no-op against an existing database.
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'dbo.tb_Stock_SkuStock', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[tb_Stock_SkuStock](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[CustomerId] [bigint] NOT NULL,
	[WarehouseId] [bigint] NOT NULL,
	[SkuId] [bigint] NOT NULL,
	[StockQty] [int] NOT NULL,
	[UsableQty] [int] NOT NULL,
	[OccupyQty] [int] NOT NULL,
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
 CONSTRAINT [PK_tb_Stock_SkuStock] PRIMARY KEY CLUSTERED ([Id] ASC)
) ON [PRIMARY]
END
GO
