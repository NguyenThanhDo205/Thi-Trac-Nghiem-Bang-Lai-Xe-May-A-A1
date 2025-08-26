// Trang Chủ
document.getElementById('userForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const userInfo = {
        name: document.getElementById('name').value,
        birthYear: document.getElementById('birthYear').value,
        gender: document.getElementById('gender').value,
        hometown: document.getElementById('hometown').value,
        id: Date.now()
    };
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    window.location.href = 'groups.html';
});

// Trang Nhóm
async function loadGroups() {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        const groupList = document.getElementById('groupList');
        groupList.innerHTML = '';
        data.groups.forEach(group => {
            const card = document.createElement('div');
            card.className = 'group-card';
            card.innerHTML = `<h2>${group.name}</h2><p>${group.questions.length} câu</p><button onclick="startQuiz(${group.id})">Bắt Đầu Nhóm</button>`;
            groupList.appendChild(card);
        });
    } catch (error) {
        console.error('Lỗi load nhóm:', error);
    }
}
if (window.location.pathname.includes('groups.html')) loadGroups();

function startQuiz(groupId) {
    localStorage.setItem('currentGroup', groupId);
    window.location.href = `quiz.html?group=${groupId}`;
}

// Trang Quiz
let questions = [];
let currentQuestion = 0;
let answers = [];
let timerInterval;

async function loadQuiz() {
    const groupId = localStorage.getItem('currentGroup');
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        const group = data.groups.find(g => g.id == groupId);
        document.getElementById('groupName').textContent = group.name;
        questions = group.questions;
        if (questions.length !== 25) {
            alert('Số câu hỏi trong nhóm không đúng 25. Vui lòng kiểm tra questions.json');
        }
        showQuestion();
        startTimer();
    } catch (error) {
        console.error('Lỗi load quiz:', error);
    }
}

function startTimer() {
    let time = 19 * 60;
    timerInterval = setInterval(() => {
        time--;
        const min = Math.floor(time / 60);
        const sec = time % 60;
        document.getElementById('timer').textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        if (time <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
        }
    }, 1000);
}

function showQuestion() {
    const q = questions[currentQuestion];
    const questionDiv = document.getElementById('question');
    questionDiv.innerHTML = `<div class="question ${q.isCritical ? 'critical' : ''}">
        <p>Câu ${currentQuestion + 1}: ${q.text}</p>
    </div>`;
    q.options.forEach((opt, i) => {
        questionDiv.innerHTML += `<label><input type="radio" name="answer" value="${i}">${opt}</label>`;
    });
    document.getElementById('nextBtn').onclick = nextQuestion;
    if (currentQuestion === questions.length - 1) {
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('submitBtn').style.display = 'block';
        document.getElementById('submitBtn').onclick = submitQuiz;
    }
}

function nextQuestion() {
    const selected = document.querySelector('input[name="answer"]:checked')?.value;
    if (!selected) return alert('Vui lòng chọn đáp án!');
    answers.push({ questionId: questions[currentQuestion].id, selected: parseInt(selected) });
    currentQuestion++;
    if (currentQuestion < questions.length) {
        showQuestion();
    }
}

async function submitQuiz() {
    clearInterval(timerInterval);
    let score = 0;
    let failedCritical = false;
    const questionDiv = document.getElementById('question');
    questionDiv.innerHTML = '';
    questions.forEach((q, i) => {
        const selected = answers.find(a => a.questionId === q.id)?.selected;
        const isCorrect = selected === q.answer;
        if (isCorrect) score++;
        if (q.isCritical && !isCorrect) failedCritical = true;
        const resultClass = isCorrect ? 'correct' : 'incorrect';
        questionDiv.innerHTML += `<div class="question ${resultClass}">
            <p>Câu ${i + 1}: ${q.text} ${q.isCritical ? '(Điểm liệt)' : ''}</p>
            <p>Đáp án chọn: ${selected !== undefined ? q.options[selected] : 'Không chọn'}</p>
            <p>Đáp án đúng: ${q.options[q.answer]}</p>
        </div>`;
    });
    const pass = score >= 21 && !failedCritical;
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const payload = {
        name: userInfo.name,
        birthyear: userInfo.birthYear,
        gender: userInfo.gender,
        hometown: userInfo.hometown,
        group: localStorage.getItem('currentGroup'),
        fromQ: questions[0].id,
        toQ: questions[questions.length - 1].id,
        score,
        percent: (score / questions.length) * 100,
        answers,
        pass
    };
    try {
        await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        questionDiv.innerHTML += `<div class="result">
            <h2>Kết quả: ${score}/25</h2>
            <p>${pass ? 'Đậu' : 'Rớt (Cần ≥21/25 và không sai câu điểm liệt)'}</p>
            <button id="backBtn">Quay Lại</button>
        </div>`;
        document.getElementById('backBtn').onclick = () => window.location.href = 'groups.html';
        document.getElementById('submitBtn').style.display = 'none';
    } catch (error) {
        console.error('Lỗi submit:', error);
    }
}

if (window.location.pathname.includes('quiz.html')) {
    loadQuiz();
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = () => window.history.pushState(null, null, window.location.href);
}

// Trang Admin
async function loadAdmin() {
    try {
        const response = await fetch('/api/submissions', { headers: { 'Content-Type': 'application/json' } });
        if (response.status === 401) {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('logoutBtn').style.display = 'none';
            document.getElementById('historyTable').style.display = 'none';
            return;
        }
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('historyTable').style.display = 'block';
        const submissions = await response.json();
        const filterUser = document.getElementById('filterUser');
        const users = [...new Set(submissions.map(s => s.name))];
        filterUser.innerHTML = '<option value="">Tất Cả Người Dùng</option>';
        users.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (Số bài làm: ${submissions.filter(s => s.name === name).length})`;
            filterUser.appendChild(option);
        });

        document.getElementById('filterUser').onchange = () => filterTable(document.getElementById('filterUser').value, document.getElementById('filterGroup').value);
        document.getElementById('filterGroup').onchange = () => filterTable(document.getElementById('filterUser').value, document.getElementById('filterGroup').value);

        async function filterTable(user = '', group = '') {
            const table = document.getElementById('historyTable');
            table.innerHTML = '<table><tr><th>Tên</th><th>Nhóm</th><th>Điểm</th><th>%</th><th>Đậu/Rớt</th><th>Ngày</th><th>Chi Tiết</th><th>Hành Động</th></tr>';
            let filteredSubs = submissions;
            if (user) filteredSubs = filteredSubs.filter(sub => sub.name === user);
            if (group) filteredSubs = filteredSubs.filter(sub => sub.group == group);
            filteredSubs.forEach(sub => {
                const groupName = document.querySelector(`#filterGroup option[value="${sub.group}"]`)?.text || 'Unknown';
                table.innerHTML += `<tr>
                    <td>${sub.name}</td>
                    <td>${groupName}</td>
                    <td>${sub.score}/25</td>
                    <td>${sub.percent.toFixed(2)}%</td>
                    <td>${sub.pass ? 'Đậu' : 'Rớt'}</td>
                    <td>${new Date(sub.datetime).toLocaleString('vi-VN')}</td>
                    <td><button onclick='viewDetails(${JSON.stringify(sub)})'>Xem</button></td>
                    <td><button onclick='deleteSubmission("${sub.id}")'>Xóa</button></td>
                </tr>`;
            });
            table.innerHTML += '</table>';
        }
        filterTable();
    } catch (error) {
        console.error('Lỗi load admin:', error);
    }
}

// Xóa bài làm
async function deleteSubmission(id) {
    if (!confirm('Bạn chắc chắn muốn xóa bài làm này?')) return;
    try {
        const response = await fetch(`/api/submissions/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (response.ok) {
            loadAdmin();
        } else {
            alert(`Xóa thất bại: ${result.error || 'Vui lòng thử lại.'}`);
        }
    } catch (error) {
        console.error('Lỗi xóa:', error);
        alert(`Xóa thất bại do lỗi server: ${error.message}`);
    }
}

// Xóa toàn bộ lịch sử người dùng
async function deleteUserHistory(name) {
    if (!confirm(`Bạn chắc chắn muốn xóa toàn bộ lịch sử của ${name}?`)) return;
    try {
        const response = await fetch(`/api/submissions/user/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (response.ok) {
            loadAdmin();
        } else {
            alert(`Xóa thất bại: ${result.error || 'Vui lòng thử lại.'}`);
        }
    } catch (error) {
        console.error('Lỗi xóa lịch sử người dùng:', error);
        alert(`Xóa thất bại do lỗi server: ${error.message}`);
    }
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (result.ok) loadAdmin();
        else alert('Sai thông tin đăng nhập');
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
    }
}

async function logout() {
    await fetch('/admin/logout', { method: 'POST' });
    window.location.reload();
}

async function viewDetails(sub) {
    try {
        const response = await fetch('questions.json');
        const data = await response.json();
        const group = data.groups.find(g => g.id == sub.group);
        const questions = group ? group.questions : [];

        const details = document.getElementById('details');
        details.style.display = 'block';
        document.getElementById('closeDetails').style.display = 'block';
        const groupName = document.querySelector(`#filterGroup option[value="${sub.group}"]`)?.text || 'Unknown';
        details.innerHTML = `<h2>Chi Tiết Bài Làm: ${sub.name}</h2>
            <p>Nhóm: ${groupName}</p>
            <p>Điểm: ${sub.score}/25 (${sub.percent.toFixed(2)}%)</p>
            <p>Đậu/Rớt: ${sub.pass ? 'Đậu' : 'Rớt'}</p>
            <p>Ngày: ${new Date(sub.datetime).toLocaleString('vi-VN')}</p>
            <button onclick='deleteUserHistory("${sub.name}")'>Xóa Lịch Sử Người Này</button>`;
        sub.answers.forEach((ans, i) => {
            const q = questions.find(q => q.id === ans.questionId) || { text: 'Không tìm thấy câu hỏi', options: [], answer: 0, isCritical: false };
            const isCorrect = ans.selected === q.answer;
            details.innerHTML += `<div class="question ${isCorrect ? 'correct' : 'incorrect'}">
                <p>Câu ${i + 1}: ${q.text} ${q.isCritical ? '(Điểm liệt)' : ''}</p>
                <p>Đáp án chọn: ${ans.selected !== undefined ? q.options[ans.selected] : 'Không chọn'}</p>
                <p>Đáp án đúng: ${q.options[q.answer]}</p>
            </div>`;
        });
    } catch (error) {
        console.error('Lỗi load chi tiết:', error);
    }
}

if (window.location.pathname.includes('admin.html')) loadAdmin();