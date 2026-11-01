using OfficeOpenXml;
using YamAuth.Service.Abstractions;

namespace YamAuth.Service.Infrastructure;

public class ExcelExportService : IService, IExcelExportService
{
    public byte[] GenerateXlsx<T>(string sheetName, IList<ExcelColumn<T>> columns, IList<T> data)
    {
        try
        {
            ExcelPackage.License.SetNonCommercialPersonal("YamAuth");
            using var package = new ExcelPackage();
            var sheet = package.Workbook.Worksheets.Add(sheetName);

            // 默认开启网格线（防止部分 Excel 版本不显示）
            sheet.View.ShowGridLines = true;

            // 1. 渲染表头
            for (int c = 0; c < columns.Count; c++)
            {
                sheet.Cells[1, c + 1].Value = columns[c].Header;
            }

            // 美化表头：加粗、背景色填充、居中
            using (var headerRange = sheet.Cells[1, 1, 1, columns.Count])
            {
                headerRange.Style.Font.Bold = true;
                headerRange.Style.Font.Color.SetColor(System.Drawing.Color.White);
                // 经典的商务深蓝色表头背景
                headerRange.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                headerRange.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(44, 62, 80));
                headerRange.Style.HorizontalAlignment = OfficeOpenXml.Style.ExcelHorizontalAlignment.Center;
            }

            // 2. 渲染数据行
            for (int r = 0; r < data.Count; r++)
            {
                var row = r + 2;
                for (int c = 0; c < columns.Count; c++)
                {
                    var val = columns[c].ValueGetter(data[r]);
                    sheet.Cells[row, c + 1].Value = val;
                }
            }

            // 3. 处理列宽（★注意：顺序调换了）
            // 先让全表自适应基本宽度
            sheet.Cells.AutoFitColumns();

            // 再应用用户手动指定的特殊宽度（覆盖自适应）
            for (int c = 0; c < columns.Count; c++)
            {
                if (columns[c].Width.HasValue)
                {
                    sheet.Column(c + 1).Width = columns[c].Width.Value;
                }
                else
                {
                    // 防止 AutoFit 偶尔把列缩得太窄，设置一个最小安全列宽
                    if (sheet.Column(c + 1).Width < 12)
                    {
                        sheet.Column(c + 1).Width = 12;
                    }
                }
            }

            return package.GetAsByteArray();
        }
        catch (Exception ex )
        {

            return null;
        }

    }
}
