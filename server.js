const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change_this_secret';

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use('/', express.static(path.join(__dirname, 'public')));

// Nộp bài
app.post('/api/submit', (req, res) => {
    const payload = req.body;
    if (!payload.name || !payload.group || !Array.isArray(payload.answers)) {
        return res.status(400).json({ error: 'Invalid payload' });
    }
    const subs = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const attempt = {
        id: 'a_' + Date.now(),
        datetime: new Date().toISOString(),
        name: payload.name,
        birthyear: payload.birthyear || '',
        gender: payload.gender || '',
        hometown: payload.hometown || '',
        group: payload.group,
        fromQ: payload.fromQ,
        toQ: payload.toQ,
        score: payload.score || null,
        percent: payload.percent || null,
        answers: payload.answers,
        pass: payload.pass
    };
    subs.unshift(attempt);
    fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2));
    console.log('New submission added:', attempt); // Debug: Log khi thêm bài làm
    res.json({ ok: true, attempt });
});

// Xóa bài làm
app.delete('/api/submissions/:id', adminOnly, (req, res) => {
    if (!req.session || !req.session.admin) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const subs = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const updatedSubs = subs.filter(sub => sub.id !== req.params.id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedSubs, null, 2));
    console.log(`Deleted submission with id: ${req.params.id}`); // Debug: Log khi xóa
    res.json({ ok: true });
});

// Xóa toàn bộ lịch sử của một người dùng
app.delete('/api/submissions/user/:name', adminOnly, (req, res) => {
    if (!req.session || !req.session.admin) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const subs = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const updatedSubs = subs.filter(sub => sub.name !== req.params.name);
    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedSubs, null, 2));
    console.log(`Deleted all submissions for user: ${req.params.name}`); // Debug: Log khi xóa
    res.json({ ok: true });
});

// Admin login/logout
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.admin = true;
        return res.json({ ok: true });
    }
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
});
app.post('/admin/logout', (req, res) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
});

function adminOnly(req, res, next) {
    if (req.session && req.session.admin) return next();
    return res.status(401).json({ error: 'unauthorized' });
}
app.get('/api/submissions', adminOnly, (req, res) => {
    const subs = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log('Submissions sent to client:', subs); // Debug: Log dữ liệu gửi đi
    res.json(subs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running http://localhost:' + PORT));