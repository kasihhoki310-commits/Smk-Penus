const API_BASE = 'http://localhost:3000/api';
let isAuthenticated = false;

// Check Authentication
window.addEventListener('load', () => {
  const passwordModal = document.getElementById('passwordModal');
  if (!isAuthenticated) {
    passwordModal.style.display = 'flex';
  }
});

// Verify Password
async function verifyPassword() {
  const password = document.getElementById('adminPassword').value;
  if (!password) {
    alert('Masukkan password');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await response.json();

    if (data.valid) {
      isAuthenticated = true;
      document.getElementById('passwordModal').style.display = 'none';
      loadDashboard();
      loadConfig();
    } else {
      document.getElementById('errorMsg').style.display = 'block';
      document.getElementById('errorMsg').textContent = 'Password salah';
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Menu Navigation
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const menu = e.target.dataset.menu;
    
    if (!menu) return;

    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    e.target.classList.add('active');
    document.getElementById(menu).classList.add('active');

    if (menu === 'guru') loadGuruList();
    if (menu === 'laporan') loadLaporan();
    if (menu === 'dashboard') loadDashboard();
  });
});

// Load Dashboard
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/guru`);
    const guruList = await response.json();
    document.getElementById('totalGuru').textContent = guruList.length;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Load Guru List
async function loadGuruList() {
  try {
    const response = await fetch(`${API_BASE}/guru`);
    const guruList = await response.json();
    const daftarGuru = document.getElementById('daftarGuru');
    daftarGuru.innerHTML = '';

    guruList.forEach(guru => {
      const item = document.createElement('div');
      item.className = 'guru-item';
      item.innerHTML = `
        <h4>${guru.nama}</h4>
        <p>NIP: ${guru.nip || 'N/A'}</p>
        <p>Email: ${guru.email || 'N/A'}</p>
        <div class="guru-actions">
          <button class="btn-delete" onclick="deleteGuru('${guru.id}')">🗑️ Hapus</button>
        </div>
      `;
      daftarGuru.appendChild(item);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// Open Tambah Guru Modal
function openTambahGuruModal() {
  document.getElementById('formTambahGuru').style.display = 'block';
}

// Close Tambah Guru Modal
function closeTambahGuruModal() {
  document.getElementById('formTambahGuru').style.display = 'none';
}

// Tambah Guru
async function tambahGuru() {
  const nama = document.getElementById('namaGuru').value;
  const nip = document.getElementById('nipGuru').value;
  const email = document.getElementById('emailGuru').value;

  if (!nama) {
    alert('Nama guru harus diisi');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/guru`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, nip, email })
    });

    if (response.ok) {
      alert('Guru berhasil ditambahkan');
      closeTambahGuruModal();
      loadGuruList();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Delete Guru
async function deleteGuru(guruId) {
  if (!confirm('Yakin ingin menghapus guru ini?')) return;

  try {
    const response = await fetch(`${API_BASE}/guru/${guruId}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Guru berhasil dihapus');
      loadGuruList();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Load Laporan
async function loadLaporan() {
  const bulan = document.getElementById('bulanLaporan').value;
  const tahun = document.getElementById('tahunLaporan').value;

  try {
    const response = await fetch(`${API_BASE}/laporan/${bulan}/${tahun}`);
    const data = await response.json();

    let html = `
      <table class="laporan-table">
        <thead>
          <tr>
            <th>Nama Guru</th>
            <th>Tanggal</th>
            <th>Jam Masuk</th>
            <th>Jam Pulang</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach(row => {
      html += `
        <tr>
          <td>${row.nama}</td>
          <td>${row.tanggal || '-'}</td>
          <td>${row.jam_masuk || '-'}</td>
          <td>${row.jam_pulang || '-'}</td>
          <td>${row.status || '-'}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    document.getElementById('tableLaporan').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Print Laporan
function printLaporan() {
  const bulan = document.getElementById('bulanLaporan').value;
  const tahun = document.getElementById('tahunLaporan').value;
  const table = document.querySelector('.laporan-table');

  if (!table) {
    alert('Silakan load laporan terlebih dahulu');
    return;
  }

  const printWindow = window.open('', '', 'height=500,width=800');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan Absensi ${bulan}/${tahun}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background: #ddd; font-weight: bold; }
        h2 { text-align: center; }
      </style>
    </head>
    <body>
      <h2>Laporan Absensi Bulan ${bulan}/${tahun}</h2>
      ${table.outerHTML}
      <br><br>
      <p>Mengetahui,</p>
      <br><br>
      <p>Kepala Sekolah</p>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Load Config
async function loadConfig() {
  try {
    const response = await fetch(`${API_BASE}/config`);
    const config = await response.json();
    
    document.getElementById('schoolName').value = config.school_name || '';
    document.getElementById('kepalSekolah').value = config.kepala_sekolah || '';
    document.getElementById('wksKurikulum').value = config.wks_kurikulum || '';
  } catch (error) {
    console.error('Error:', error);
  }
}

// Simpan Konfigurasi
async function simpanKonfigurasi() {
  const schoolName = document.getElementById('schoolName').value;
  const kepalSekolah = document.getElementById('kepalSekolah').value;
  const wksKurikulum = document.getElementById('wksKurikulum').value;
  const newPassword = document.getElementById('newAdminPassword').value;

  try {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_name: schoolName,
        kepala_sekolah: kepalSekolah,
        wks_kurikulum: wksKurikulum,
        admin_password: newPassword
      })
    });

    if (response.ok) {
      alert('Konfigurasi berhasil disimpan');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
