const { sql, getPool } = require('../config/db');

async function listRoles() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT RoleID, RoleName, Description FROM Roles ORDER BY RoleID');
  return result.recordset;
}

async function findRoleById(roleId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('roleId', sql.Int, roleId)
    .query('SELECT RoleID, RoleName, Description FROM Roles WHERE RoleID = @roleId');
  return result.recordset[0] || null;
}

module.exports = { listRoles, findRoleById };
