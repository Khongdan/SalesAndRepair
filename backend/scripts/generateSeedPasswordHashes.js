/**
 * Sinh bcrypt hash THẬT cho các tài khoản demo trong database/seed.sql,
 * để thay thế các giá trị PasswordHash placeholder.
 *
 * Cách dùng:
 *   cd backend
 *   node scripts/generateSeedPasswordHashes.js
 *
 * Script chỉ in ra các câu lệnh UPDATE — không tự động ghi vào database.
 * Copy kết quả và chạy trong SSMS/Azure Data Studio, hoặc dùng làm seed.sql mới.
 */
const bcrypt = require('bcryptjs');

const demoAccounts = [
  { username: 'admin', password: 'Admin@123' },
  { username: 'manager01', password: 'Manager@123' },
  { username: 'cashier01', password: 'Cashier@123' },
  { username: 'tech01', password: 'Tech@123' },
  { username: 'warehouse01', password: 'Warehouse@123' },
];

async function main() {
  console.log('-- Chạy các câu lệnh UPDATE sau trong SalesRepairDB để thay hash placeholder bằng hash thật:\n');
  for (const acc of demoAccounts) {
    const hash = await bcrypt.hash(acc.password, 10);
    console.log(
      `UPDATE Users SET PasswordHash = '${hash}' WHERE Username = '${acc.username}';`
    );
  }
}

main();
