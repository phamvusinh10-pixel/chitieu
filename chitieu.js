// 1. Tự động khôi phục dữ liệu đã lưu trong máy
let transactions = JSON.parse(localStorage.getItem('finance_transactions')) || [];

function saveToLocalStorage() {
    localStorage.setItem('finance_transactions', JSON.stringify(transactions));
}

// 2. Chuyển đổi giao diện Ban Ngày (6h-18h) / Ban Đêm (18h-6h)
function applyDayNightTheme() {
    const hours = new Date().getHours();
    const isDayTime = hours >= 6 && hours < 18;

    if (isDayTime) {
        document.body.classList.add('day-mode');
        document.body.classList.remove('night-mode');
    } else {
        document.body.classList.add('night-mode');
        document.body.classList.remove('day-mode');
    }
}
applyDayNightTheme();

const form = document.getElementById('finance-form');
const dateInput = document.getElementById('date');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const noteInput = document.getElementById('note');

const list = document.getElementById('transaction-list');
const recentList = document.getElementById('recent-3days-list');

const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');

const categories = {
    income: ['Tiền mặt', 'Tiền tiết kiệm', 'Tiền tài khoản', 'Khác'],
    expense: ['Ăn uống', 'Di chuyển', 'Nhà cửa', 'Giải trí', 'Mua sắm', 'Tiết kiệm', 'Khác']
};

function updateCategories() {
    const selectedType = typeInput.value;
    const availableCategories = categories[selectedType];
    
    categoryInput.innerHTML = availableCategories
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('');
}

// Set ngày mặc định là hôm nay (YYYY-MM-DD)
dateInput.value = new Date().toLocaleDateString('en-CA');
updateCategories();

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

// Thuật toán tính Âm lịch Việt Nam
function getLunarDate(day, month, year) {
    const k = Math.floor((14 - month) / 12);
    const y = year + 4800 - k;
    const m = month + 12 * k - 3;
    const julianDay = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    
    const lunarDay = Math.floor(((julianDay - 2451545.5 - 0.25) % 29.530588853 + 29.530588853) % 29.530588853) + 1;
    let lunarMonth = Math.floor(((julianDay - 2451556) / 29.530588853) % 12) + 1;
    if (lunarMonth <= 0) lunarMonth += 12;

    return `${lunarDay}/${lunarMonth}`;
}

function updateSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expense;

    totalIncomeEl.innerText = formatMoney(income);
    totalExpenseEl.innerText = formatMoney(expense);
    netBalanceEl.innerText = formatMoney(balance);
}

function renderList() {
    list.innerHTML = '';
    if (transactions.length === 0) {
        list.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #a0aec0; padding: 20px;">Chưa có giao dịch nào được tạo</td></tr>`;
        return;
    }

    transactions.forEach((t, index) => {
        const row = document.createElement('tr');
        const isIncome = t.type === 'income';
        
        row.innerHTML = `
            <td data-label="Ngày">${formatDate(t.date)}</td>
            <td data-label="Phân loại"><span class="badge-type ${isIncome ? 'income' : 'expense'}">${isIncome ? 'Thu nhập' : 'Chi tiêu'}</span></td>
            <td data-label="Danh mục"><span class="category-badge">${t.category}</span></td>
            <td data-label="Số tiền" class="${isIncome ? 'amount-income' : 'amount-expense'}">
                ${isIncome ? '+' : '-'}${formatMoney(t.amount)}
            </td>
            <td data-label="Ghi chú">${t.note || '-'}</td>
            <td data-label="" style="text-align: center;"><button class="btn-delete" onclick="deleteTransaction(${index})">Xóa</button></td>
        `;
        list.appendChild(row);
    });
}

function render3DaysHistory() {
    recentList.innerHTML = '';
    
    const selectedDateVal = dateInput.value;
    const anchorDate = selectedDateVal ? new Date(selectedDateVal) : new Date();
    
    const endDate = new Date(anchorDate);
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(anchorDate);
    startDate.setDate(startDate.getDate() - 2);
    startDate.setHours(0, 0, 0, 0);

    const recentTransactions = transactions.filter(t => {
        const itemDate = new Date(t.date);
        return itemDate >= startDate && itemDate <= endDate;
    });

    if (recentTransactions.length === 0) {
        recentList.innerHTML = `<div class="no-data-compact">Không có giao dịch nào trong 3 ngày quanh mốc đã chọn</div>`;
        return;
    }

    recentTransactions.forEach(t => {
        const item = document.createElement('div');
        const isIncome = t.type === 'income';
        item.className = `recent-item-compact ${isIncome ? 'income' : 'expense'}`;
        
        const [y, m, d] = t.date.split('-').map(Number);
        const lunarStr = getLunarDate(d, m, y);

        item.innerHTML = `
            <div class="recent-left">
                <div class="date-badge">
                    <span class="day-big">${d < 10 ? '0' + d : d}</span>
                    <span class="month-small">Thg ${m}</span>
                </div>
                <div class="recent-info">
                    <span class="recent-title">${t.category} ${t.note ? `• ${t.note}` : ''}</span>
                    <span class="recent-meta">
                        <span>Âm lịch:</span>
                        <span class="lunar-tag">${lunarStr}</span>
                    </span>
                </div>
            </div>
            <span class="recent-amount ${isIncome ? 'amount-income' : 'amount-expense'}">
                ${isIncome ? '+' : '-'}${formatMoney(t.amount)}
            </span>
        `;
        recentList.appendChild(item);
    });
}

function addTransaction(e) {
    e.preventDefault();

    const date = dateInput.value;
    const type = typeInput.value;
    const category = categoryInput.value;
    let amount = parseFloat(amountInput.value);
    const note = noteInput.value.trim();

    if (!date || isNaN(amount) || amount <= 0) return;

    if (amount < 1000) {
        amount = amount * 1000;
    }

    transactions.push({ date, type, category, amount, note });

    saveToLocalStorage();

    amountInput.value = '';
    noteInput.value = '';

    renderList();
    render3DaysHistory();
    updateSummary();
}

function deleteTransaction(index) {
    transactions.splice(index, 1);
    
    saveToLocalStorage();

    renderList();
    render3DaysHistory();
    updateSummary();
}

form.addEventListener('submit', addTransaction);

renderList();
render3DaysHistory();
updateSummary();
