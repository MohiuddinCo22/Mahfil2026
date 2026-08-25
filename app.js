// ===================== CONFIG =====================
// Standard chanda tiers shown as dashboard boxes.
// Any amount that doesn't match one of these falls into "other".
const TIERS = [500, 1000, 2000, 3000, 4000, 5000];

let currentUser = null;
let chandaData = [];   // cached list of { id, name, address, reference, amount, date }
let kharochData = [];  // cached list of { id, title, amount, description, date }
let activeTierFilter = null; // number or 'other' or null

// ===================== AUTH GUARD =====================
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  document.getElementById('whoEmail').textContent = user.email;
  startListeners();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.signOut().then(() => { window.location.href = 'index.html'; });
});

// ===================== NAV =====================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('section-' + item.dataset.section).classList.add('active');
  });
});

// ===================== HELPERS =====================
function taka(n) {
  n = Number(n) || 0;
  return '৳ ' + n.toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '-';
  try {
    const dt = (d.toDate) ? d.toDate() : new Date(d);
    return dt.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return String(d); }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'msg show ' + type;
  setTimeout(() => el.classList.remove('show'), 3500);
}

function tierLabel(t) {
  return t === 'other' ? 'অন্যান্য' : taka(t);
}

// ===================== FIRESTORE LISTENERS =====================
function startListeners() {
  db.collection('chanda').orderBy('createdAt', 'desc').onSnapshot(snap => {
    chandaData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboard();
    renderChandaList();
  }, err => console.error('chanda listener error:', err));

  db.collection('kharoch').orderBy('createdAt', 'desc').onSnapshot(snap => {
    kharochData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderKharochList();
    renderDashboard();
  }, err => console.error('kharoch listener error:', err));
}

// ===================== DASHBOARD =====================
function renderDashboard() {
  // Totals
  const totalCollection = chandaData.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalExpense = kharochData.reduce((s, k) => s + (Number(k.amount) || 0), 0);
  document.getElementById('totalCollection').textContent = taka(totalCollection);
  document.getElementById('totalExpense').textContent = taka(totalExpense);
  document.getElementById('balance').textContent = taka(totalCollection - totalExpense);

  // Tier aggregation
  const tierCounts = {};
  const tierSums = {};
  TIERS.forEach(t => { tierCounts[t] = 0; tierSums[t] = 0; });
  tierCounts['other'] = 0; tierSums['other'] = 0;

  chandaData.forEach(c => {
    const amt = Number(c.amount) || 0;
    const key = TIERS.includes(amt) ? amt : 'other';
    tierCounts[key]++;
    tierSums[key] += amt;
  });

  const grid = document.getElementById('tierGrid');
  grid.innerHTML = '';
  [...TIERS, 'other'].forEach(t => {
    const box = document.createElement('div');
    box.className = 'stat-box' + (activeTierFilter === t ? ' active' : '');
    box.innerHTML = `
      <div class="tier-label">${tierLabel(t)} এর চাঁদা</div>
      <div class="tier-amount">${tierCounts[t]} জন</div>
      <div class="tier-count">মোট: <b>${taka(tierSums[t])}</b></div>
    `;
    box.addEventListener('click', () => {
      activeTierFilter = (activeTierFilter === t) ? null : t;
      renderDashboard();
      renderDashboardTable();
    });
    grid.appendChild(box);
  });

  renderDashboardTable();
}

function renderDashboardTable() {
  const body = document.getElementById('dashboardTableBody');
  const title = document.getElementById('filteredTitle');
  let rows = chandaData;

  if (activeTierFilter !== null) {
    rows = chandaData.filter(c => {
      const amt = Number(c.amount) || 0;
      return activeTierFilter === 'other' ? !TIERS.includes(amt) : amt === activeTierFilter;
    });
    title.textContent = tierLabel(activeTierFilter) + ' — ফিল্টার করা তালিকা (' + rows.length + ' জন)';
  } else {
    title.textContent = 'সব চাঁদার তালিকা (' + rows.length + ' জন)';
  }

  body.innerHTML = '';
  if (rows.length === 0) {
    body.innerHTML = '<tr class="empty-row"><td colspan="5">কোনো তথ্য নেই</td></tr>';
    return;
  }
  rows.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.name || '-')}</td>
      <td>${escapeHtml(c.address || '-')}</td>
      <td>${escapeHtml(c.reference || '-')}</td>
      <td>${fmtDate(c.createdAt)}</td>
      <td class="amount">${taka(c.amount)}</td>
    `;
    body.appendChild(tr);
  });
}

document.getElementById('clearFilterBtn').addEventListener('click', () => {
  activeTierFilter = null;
  renderDashboard();
});

// ===================== CHANDA CRUD =====================
document.getElementById('c_date').value = todayISO();

document.getElementById('chandaForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = document.getElementById('chandaSubmitBtn');
  const msgEl = document.getElementById('chandaMsg');
  const name = document.getElementById('c_name').value.trim();
  const address = document.getElementById('c_address').value.trim();
  const reference = document.getElementById('c_reference').value.trim();
  const amount = Number(document.getElementById('c_amount').value);
  const date = document.getElementById('c_date').value || todayISO();

  if (!name || !amount || amount <= 0) {
    showMsg(msgEl, 'নাম এবং সঠিক এমাউন্ট দিন।', 'error');
    return;
  }

  btn.disabled = true;
  db.collection('chanda').add({
    name, address, reference, amount,
    dateStr: date,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: currentUser.email
  }).then(() => {
    showMsg(msgEl, 'চাঁদা যোগ হয়েছে ✅', 'success');
    document.getElementById('chandaForm').reset();
    document.getElementById('c_date').value = todayISO();
  }).catch(err => {
    showMsg(msgEl, 'সমস্যা হয়েছে: ' + err.message, 'error');
  }).finally(() => { btn.disabled = false; });
});

function renderChandaList() {
  // chips for quick filter within the Chanda tab
  const chipsEl = document.getElementById('chandaChips');
  chipsEl.innerHTML = '';
  const allChip = document.createElement('div');
  allChip.className = 'chip' + (chandaListFilter === null ? ' active' : '');
  allChip.textContent = 'সব';
  allChip.addEventListener('click', () => { chandaListFilter = null; renderChandaList(); });
  chipsEl.appendChild(allChip);

  [...TIERS, 'other'].forEach(t => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (chandaListFilter === t ? ' active' : '');
    chip.textContent = tierLabel(t);
    chip.addEventListener('click', () => { chandaListFilter = (chandaListFilter === t ? null : t); renderChandaList(); });
    chipsEl.appendChild(chip);
  });

  let rows = chandaData;
  if (chandaListFilter !== null) {
    rows = chandaData.filter(c => {
      const amt = Number(c.amount) || 0;
      return chandaListFilter === 'other' ? !TIERS.includes(amt) : amt === chandaListFilter;
    });
  }

  const body = document.getElementById('chandaTableBody');
  body.innerHTML = '';
  if (rows.length === 0) {
    body.innerHTML = '<tr class="empty-row"><td colspan="6">কোনো তথ্য নেই</td></tr>';
    return;
  }
  rows.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.name || '-')}</td>
      <td>${escapeHtml(c.address || '-')}</td>
      <td>${escapeHtml(c.reference || '-')}</td>
      <td>${fmtDate(c.createdAt)}</td>
      <td class="amount">${taka(c.amount)}</td>
      <td><span class="link-del" data-id="${c.id}">মুছুন</span></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('.link-del').forEach(el => {
    el.addEventListener('click', () => {
      if (confirm('এই চাঁদার তথ্য মুছে ফেলতে চান?')) {
        db.collection('chanda').doc(el.dataset.id).delete();
      }
    });
  });
}
let chandaListFilter = null;

// ===================== KHAROCH CRUD =====================
document.getElementById('k_date').value = todayISO();

document.getElementById('kharochForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = document.getElementById('kharochSubmitBtn');
  const msgEl = document.getElementById('kharochMsg');
  const title = document.getElementById('k_title').value.trim();
  const amount = Number(document.getElementById('k_amount').value);
  const description = document.getElementById('k_desc').value.trim();
  const date = document.getElementById('k_date').value || todayISO();

  if (!title || !amount || amount <= 0) {
    showMsg(msgEl, 'খাত এবং সঠিক এমাউন্ট দিন।', 'error');
    return;
  }

  btn.disabled = true;
  db.collection('kharoch').add({
    title, amount, description,
    dateStr: date,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: currentUser.email
  }).then(() => {
    showMsg(msgEl, 'খরচ যোগ হয়েছে ✅', 'success');
    document.getElementById('kharochForm').reset();
    document.getElementById('k_date').value = todayISO();
  }).catch(err => {
    showMsg(msgEl, 'সমস্যা হয়েছে: ' + err.message, 'error');
  }).finally(() => { btn.disabled = false; });
});

function renderKharochList() {
  const body = document.getElementById('kharochTableBody');
  body.innerHTML = '';
  if (kharochData.length === 0) {
    body.innerHTML = '<tr class="empty-row"><td colspan="5">কোনো তথ্য নেই</td></tr>';
    return;
  }
  kharochData.forEach(k => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(k.title || '-')}</td>
      <td>${escapeHtml(k.description || '-')}</td>
      <td>${fmtDate(k.createdAt)}</td>
      <td class="amount">${taka(k.amount)}</td>
      <td><span class="link-del" data-id="${k.id}">মুছুন</span></td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll('.link-del').forEach(el => {
    el.addEventListener('click', () => {
      if (confirm('এই খরচের তথ্য মুছে ফেলতে চান?')) {
        db.collection('kharoch').doc(el.dataset.id).delete();
      }
    });
  });
}

// ===================== NAAT PLAYER =====================
// naat.mp3 নিজে বসাতে হবে (README দেখুন)। ব্রাউজার সাউন্ডসহ auto-play
// ব্লক করলে বাটনটা "চালু করুন" দেখাবে, ইউজার একবার ক্লিক করলেই বাজবে।
(function initNaatPlayer() {
  const audio = document.getElementById('naatAudio');
  const btn = document.getElementById('naatToggleBtn');
  if (!audio || !btn) return;

  audio.volume = 0.85;

  function setPlayingUI(isPlaying) {
    btn.classList.toggle('playing', isPlaying);
    btn.textContent = isPlaying ? '🔊 নাত চলছে' : '▶️ নাত শুনুন';
  }

  audio.play().then(() => setPlayingUI(true)).catch(() => setPlayingUI(false));

  btn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => setPlayingUI(true)).catch(() => {});
    } else {
      audio.pause();
      setPlayingUI(false);
    }
  });
})();

// ===================== UTIL =====================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
