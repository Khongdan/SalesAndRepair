const { sql, getPool } = require('../config/db');

async function listCategories() {
  const pool = await getPool();
  const result = await pool.request().query(
    'SELECT CategoryID, CategoryName, Description FROM Categories ORDER BY CategoryName'
  );
  return result.recordset;
}

async function findById(categoryId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('categoryId', sql.Int, categoryId)
    .query('SELECT CategoryID, CategoryName, Description FROM Categories WHERE CategoryID = @categoryId');
  return result.recordset[0] || null;
}

async function findByName(categoryName) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('categoryName', sql.NVarChar(100), categoryName)
    .query('SELECT CategoryID FROM Categories WHERE CategoryName = @categoryName');
  return result.recordset[0] || null;
}

async function createCategory({ categoryName, description }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('categoryName', sql.NVarChar(100), categoryName)
    .input('description', sql.NVarChar(255), description || null)
    .query(`
      INSERT INTO Categories (CategoryName, Description)
      OUTPUT INSERTED.CategoryID
      VALUES (@categoryName, @description)
    `);
  return result.recordset[0].CategoryID;
}

async function updateCategory(categoryId, { categoryName, description }) {
  const pool = await getPool();
  await pool
    .request()
    .input('categoryId', sql.Int, categoryId)
    .input('categoryName', sql.NVarChar(100), categoryName)
    .input('description', sql.NVarChar(255), description || null)
    .query('UPDATE Categories SET CategoryName = @categoryName, Description = @description WHERE CategoryID = @categoryId');
}

async function deleteCategory(categoryId) {
  const pool = await getPool();
  await pool.request().input('categoryId', sql.Int, categoryId).query('DELETE FROM Categories WHERE CategoryID = @categoryId');
}

module.exports = { listCategories, findById, findByName, createCategory, updateCategory, deleteCategory };
