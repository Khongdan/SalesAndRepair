/**
 * Service ghi log hệ thống (ActivityLogs) — mục 22 tài liệu dự án.
 * logActivity() được gọi "fire-and-forget" từ các controller sau khi thao tác
 * chính đã thành công — lỗi ghi log KHÔNG được làm hỏng response chính,
 * nên luôn bọc try/catch và chỉ console.error khi thất bại.
 */
const { sql, getPool } = require('../config/db');

async function logActivity({ userId, action, targetTable, targetId, description }) {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('userId', sql.Int, userId || null)
      .input('action', sql.NVarChar(100), action)
      .input('targetTable', sql.NVarChar(100), targetTable || null)
      .input('targetId', sql.Int, targetId || null)
      .input('description', sql.NVarChar(500), description || null)
      .query(`
        INSERT INTO ActivityLogs (UserID, Action, TargetTable, TargetID, Description)
        VALUES (@userId, @action, @targetTable, @targetId, @description)
      `);
  } catch (err) {
    // Ghi log là nghiệp vụ phụ — không throw để tránh làm hỏng request chính.
    console.error('⚠️  Không thể ghi ActivityLog:', err.message);
  }
}

async function listActivityLogs({ page = 1, pageSize = 30, userId, action } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const request = pool.request().input('offset', sql.Int, offset).input('pageSize', sql.Int, pageSize);
  let where = 'WHERE 1=1';
  if (userId) {
    request.input('userId', sql.Int, userId);
    where += ' AND al.UserID = @userId';
  }
  if (action) {
    request.input('action', sql.NVarChar(100), action);
    where += ' AND al.Action = @action';
  }

  const result = await request.query(`
    SELECT al.ActivityLogID, al.UserID, u.FullName AS UserName, al.Action,
           al.TargetTable, al.TargetID, al.Description, al.CreatedAt
    FROM ActivityLogs al
    LEFT JOIN Users u ON u.UserID = al.UserID
    ${where}
    ORDER BY al.ActivityLogID DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  const countResult = await pool.request().query('SELECT COUNT(*) AS total FROM ActivityLogs');
  return { items: result.recordset, total: countResult.recordset[0].total, page, pageSize };
}

module.exports = { logActivity, listActivityLogs };
