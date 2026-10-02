/**
 * Service truy vấn dữ liệu Users — mọi câu lệnh SQL đều dùng parameterized
 * query (sql.Request().input(...)) để chống SQL Injection, không nối chuỗi SQL thô.
 */
const { sql, getPool } = require('../config/db');

async function findByUsername(username) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('username', sql.NVarChar(50), username)
    .query(`
      SELECT u.UserID, u.Username, u.PasswordHash, u.FullName, u.Email, u.Phone,
             u.Status, u.RoleID, r.RoleName
      FROM Users u
      JOIN Roles r ON r.RoleID = u.RoleID
      WHERE u.Username = @username
    `);
  return result.recordset[0] || null;
}

async function findById(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT u.UserID, u.Username, u.FullName, u.Email, u.Phone,
             u.Status, u.RoleID, r.RoleName, u.CreatedAt
      FROM Users u
      JOIN Roles r ON r.RoleID = u.RoleID
      WHERE u.UserID = @userId
    `);
  return result.recordset[0] || null;
}

async function listUsers({ page = 1, pageSize = 20 } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const result = await pool
    .request()
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, pageSize)
    .query(`
      SELECT u.UserID, u.Username, u.FullName, u.Email, u.Phone,
             u.Status, u.RoleID, r.RoleName, u.CreatedAt
      FROM Users u
      JOIN Roles r ON r.RoleID = u.RoleID
      ORDER BY u.UserID
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);
  const countResult = await pool.request().query('SELECT COUNT(*) AS total FROM Users');
  return { items: result.recordset, total: countResult.recordset[0].total, page, pageSize };
}

async function createUser({ username, passwordHash, fullName, email, phone, roleId }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('username', sql.NVarChar(50), username)
    .input('passwordHash', sql.NVarChar(255), passwordHash)
    .input('fullName', sql.NVarChar(100), fullName)
    .input('email', sql.NVarChar(100), email || null)
    .input('phone', sql.NVarChar(20), phone || null)
    .input('roleId', sql.Int, roleId)
    .query(`
      INSERT INTO Users (Username, PasswordHash, FullName, Email, Phone, RoleID)
      OUTPUT INSERTED.UserID
      VALUES (@username, @passwordHash, @fullName, @email, @phone, @roleId)
    `);
  return result.recordset[0].UserID;
}

async function updateUser(userId, { fullName, email, phone, roleId, status }) {
  const pool = await getPool();
  await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('fullName', sql.NVarChar(100), fullName)
    .input('email', sql.NVarChar(100), email || null)
    .input('phone', sql.NVarChar(20), phone || null)
    .input('roleId', sql.Int, roleId)
    .input('status', sql.NVarChar(20), status)
    .query(`
      UPDATE Users
      SET FullName = @fullName, Email = @email, Phone = @phone,
          RoleID = @roleId, Status = @status, UpdatedAt = SYSDATETIME()
      WHERE UserID = @userId
    `);
}

async function updatePassword(userId, passwordHash) {
  const pool = await getPool();
  await pool
    .request()
    .input('userId', sql.Int, userId)
    .input('passwordHash', sql.NVarChar(255), passwordHash)
    .query('UPDATE Users SET PasswordHash = @passwordHash, UpdatedAt = SYSDATETIME() WHERE UserID = @userId');
}

module.exports = {
  findByUsername,
  findById,
  listUsers,
  createUser,
  updateUser,
  updatePassword,
};
