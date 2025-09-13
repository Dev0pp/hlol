const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// مجلد التخزين
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// قاعدة بيانات مصغرة (JSON)
const DB_FILE = path.join(__dirname, "db.json");
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// قراءة/كتابة JSON
function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ميدل وير
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOADS_DIR));

/**
 * API رفع ملف + إضافة مستخدم
 */
app.post("/upload", upload.single("file"), (req, res) => {
  const { id, serial } = req.body;
  const file = req.file;

  if (!id || !serial || !file) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const db = readDB();
  db.push({ id, serial, file: file.filename });
  writeDB(db);

  res.json({ success: true, message: "تم الحفظ بنجاح" });
});

/**
 * API جلب المستخدمين (للدashboard)
 */
app.get("/users", (req, res) => {
  const db = readDB();
  res.json(db);
});

/**
 * API حذف مستخدم
 */
app.post("/delete-user", (req, res) => {
  const { id, serial } = req.body;
  let db = readDB();
  db = db.filter((u) => !(u.id === id && u.serial === serial));
  writeDB(db);
  res.json({ success: true });
});

/**
 * API تحقق من الهوية + الرقم المرجعي
 */
app.post("/api/lookup", (req, res) => {
  const { nationalId, serial } = req.body;
  const db = readDB();

  const found = db.find((u) => u.id === nationalId && u.serial === serial);

  if (found) {
    return res.json({
      exists: true,
      downloadUrl: `/uploads/${found.file}`,
    });
  } else {
    return res.json({ exists: false });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
