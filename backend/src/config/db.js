/**
 * Cấu hình kết nối SQL Server bằng package `mssql`.
 * Sử dụng connection pool dùng chung cho toàn bộ backend.
 * Không hard-code thông tin kết nối — luôn đọc từ biến môi trường (.env).
 */
const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DATABASE_SERVER,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.DATABASE_PORT) || 1433,
  options: {
    encrypt: process.env.DATABASE_ENCRYPT === 'true',
    trustServerCertificate: process.env.DATABASE_TRUST_SERVER_CERT === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise;

/**
 * Trả về một connection pool dùng chung (singleton).
 * Các service/controller gọi getPool() rồi .request() để chạy query.
 */
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        console.log('✅ Đã kết nối SQL Server:', dbConfig.database);
        return pool;
      })
      .catch((err) => {
        console.error('❌ Lỗi kết nối SQL Server:', err.message);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool, dbConfig };
