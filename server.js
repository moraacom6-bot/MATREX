const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 1. الربط بقاعدة بيانات MongoDB Atlas الخاصة بك
const MONGO_URI = "mongodb+srv://amrsultan003_db_user:PNuXJLuoBoKepanR@cluster0.cyon1t2.mongodb.net/matrex?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات MATREX بنجاح!'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// 2. نماذج حفظ البيانات (Schemas)
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String
});
const User = mongoose.model('User', UserSchema);

const FileSchema = new mongoose.Schema({
    title: String,
    chapter: String,
    path: String,
    date: String
});
const File = mongoose.model('File', FileSchema);

// إعداد التخزين للملفات المرفوعة
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// 3. تسجيل حساب جديد
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role, secretKey } = req.body;
        if (role === 'teacher' && secretKey !== 'MATREX2026') {
            return res.status(400).json({ error: 'كود المدرس غير صحيح!' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل!' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, role });
        await newUser.save();

        res.json({ message: 'تم إنشاء الحساب بنجاح' });
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
});

// 4. تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'البريد أو كلمة السر خاطئة!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'البريد أو كلمة السر خاطئة!' });

        res.json({ user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
});

// 5. رفع ملف وحفظ بياناته
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { title, chapter, role } = req.body;
        if (role !== 'teacher') return res.status(403).json({ error: 'غير مصرح لك بالرفع!' });

        const newFile = new File({
            title,
            chapter: chapter || 'عام',
            path: `/uploads/${req.file.filename}`,
            date: new Date().toLocaleDateString('ar-EG')
        });

        await newFile.save();
        res.json({ message: 'تم رفع الملف بنجاح', file: newFile });
    } catch (err) {
        res.status(500).json({ error: 'فشل رفع الملف' });
    }
});

// 6. جلب جميع الملفات
app.get('/api/files', async (req, res) => {
    try {
        const files = await File.find();
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: 'خطأ في جلب الملفات' });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));