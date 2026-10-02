/**
 * Route kiểm tra tình trạng server và kết nối database.
 * GET /api/health
 */
const express = require('express');
const { getPool, sql } = require('../config/db');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT GETDATE() AS serverTime');
    return success(res, {
      status: 'ok',
      database: 'connected',
      serverTime: result.recordset[0].serverTime,
    }, 'Backend và Database hoạt động bình thường');
  } catch (err) {
    return fail(res, 'Không thể kết nối Database', [err.message], 503);
  }
});

module.exports = router;
