/**
 * Service tổng hợp dữ liệu cho Dashboard (mục 4 tài liệu dự án).
 * Gom nhiều query nhỏ thành 1 lần gọi duy nhất từ frontend để tránh
 * nhiều round-trip khi tải trang chủ.
 */
const { sql, getPool } = require('../config/db');

async function getDashboardSummary() {
  const pool = await getPool();

  const todayRevenueResult = await pool.request().query(`
    SELECT ISNULL(SUM(FinalAmount), 0) AS Revenue, COUNT(*) AS OrderCount
    FROM SalesOrders
    WHERE Status = 'COMPLETED' AND CAST(OrderDate AS DATE) = CAST(SYSDATETIME() AS DATE)
  `);

  const monthRevenueResult = await pool.request().query(`
    SELECT ISNULL(SUM(FinalAmount), 0) AS Revenue
    FROM SalesOrders
    WHERE Status = 'COMPLETED'
      AND YEAR(OrderDate) = YEAR(SYSDATETIME()) AND MONTH(OrderDate) = MONTH(SYSDATETIME())
  `);

  const activeRepairsResult = await pool.request().query(`
    SELECT COUNT(*) AS ActiveRepairs
    FROM RepairOrders
    WHERE Status NOT IN (N'Đã giao khách', N'Từ chối sửa chữa', N'Hủy')
  `);

  const unfinishedRepairsResult = await pool.request().query(`
    SELECT COUNT(*) AS UnfinishedRepairs
    FROM RepairOrders
    WHERE Status = N'Đã sửa xong'
  `);

  const productCountResult = await pool.request().query(`SELECT COUNT(*) AS Total FROM Products WHERE Status = 'ACTIVE'`);

  const lowStockProductsResult = await pool.request().query(`
    SELECT ProductID, ProductCode, ProductName, Quantity, MinStock
    FROM Products WHERE Quantity <= MinStock AND Status = 'ACTIVE'
  `);

  const estimatedProfitResult = await pool.request().query(`
    SELECT
      ISNULL(SUM(sod.Quantity * sod.UnitPrice), 0) - ISNULL(SUM(sod.Quantity * p.ImportPrice), 0) AS EstimatedProfit
    FROM SalesOrders so
    JOIN SalesOrderDetails sod ON sod.SalesOrderID = so.SalesOrderID
    JOIN Products p ON p.ProductID = sod.ProductID
    WHERE so.Status = 'COMPLETED'
      AND YEAR(so.OrderDate) = YEAR(SYSDATETIME()) AND MONTH(so.OrderDate) = MONTH(SYSDATETIME())
  `);

  const revenueByDayResult = await pool.request().query(`
    SELECT FORMAT(OrderDate, 'yyyy-MM-dd') AS Day, SUM(FinalAmount) AS Revenue
    FROM SalesOrders
    WHERE Status = 'COMPLETED' AND OrderDate >= DATEADD(DAY, -13, CAST(SYSDATETIME() AS DATE))
    GROUP BY FORMAT(OrderDate, 'yyyy-MM-dd')
    ORDER BY Day
  `);

  const salesVsRepairResult = await pool.request().query(`
    SELECT
      (SELECT ISNULL(SUM(FinalAmount), 0) FROM SalesOrders
       WHERE Status = 'COMPLETED' AND YEAR(OrderDate) = YEAR(SYSDATETIME()) AND MONTH(OrderDate) = MONTH(SYSDATETIME())) AS SalesRevenue,
      (SELECT ISNULL(SUM(Amount), 0) FROM Payments
       WHERE ReferenceType = 'REPAIR_ORDER' AND YEAR(PaymentDate) = YEAR(SYSDATETIME()) AND MONTH(PaymentDate) = MONTH(SYSDATETIME())) AS RepairRevenue
  `);

  const recentSalesResult = await pool.request().query(`
    SELECT TOP 5 so.SalesOrderCode, c.FullName AS CustomerName, so.OrderDate, so.FinalAmount
    FROM SalesOrders so
    LEFT JOIN Customers c ON c.CustomerID = so.CustomerID
    ORDER BY so.SalesOrderID DESC
  `);

  const recentRepairsResult = await pool.request().query(`
    SELECT TOP 5 ro.RepairOrderCode, c.FullName AS CustomerName, ro.Status, ro.ReceivedDate
    FROM RepairOrders ro
    JOIN Customers c ON c.CustomerID = ro.CustomerID
    ORDER BY ro.RepairOrderID DESC
  `);

  return {
    todayRevenue: todayRevenueResult.recordset[0].Revenue,
    todayOrderCount: todayRevenueResult.recordset[0].OrderCount,
    monthRevenue: monthRevenueResult.recordset[0].Revenue,
    activeRepairs: activeRepairsResult.recordset[0].ActiveRepairs,
    unfinishedRepairs: unfinishedRepairsResult.recordset[0].UnfinishedRepairs,
    productCount: productCountResult.recordset[0].Total,
    lowStockProducts: lowStockProductsResult.recordset,
    estimatedProfitThisMonth: estimatedProfitResult.recordset[0].EstimatedProfit,
    revenueByDay: revenueByDayResult.recordset,
    salesVsRepairThisMonth: salesVsRepairResult.recordset[0],
    recentSales: recentSalesResult.recordset,
    recentRepairs: recentRepairsResult.recordset,
  };
}

module.exports = { getDashboardSummary };
