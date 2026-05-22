const API_BASE = 'http://localhost:3000/api';
let currentGuruId = null;
let currentTab = 'masuk';
let photoDataMasuk = null;
let photoDataPulang = null;
let currentLokasi = null;

// Update Date and Time
function updateDateTime() {
  const now = new Date();
  const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const optionsTime = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
  
  document.getElementById('currentDate').textContent = now.toLocaleDateString('id-ID', optionsDate);
  document.getElementById('currentTime').textContent = now.toLocaleTimeString('id-ID', optionsTime);
}

setInterval(updateDateTime, 1000);
updateDateTime();

// Load School Config
async function loadSchoolConfig() {
  try {
    const response = await fetch(`${API_BASE}/config`);
    const config = await response.json();
    document.getElementById('schoolName').textContent = config.school_name || 'SMK Penus Bebas';
    if (config.school_logo) {
      document.getElementById('schoolLogo').src = config.school_logo;
      document.getElementById('schoolLogo').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

loadSchoolConfig();

// Load Guru Data
async function loadGuru() {
  try {
    const response = await fetch(`${API_BASE}/guru`);
    const guruList = await response.json();
    displayGuru(guruList);
  } catch (error) {
    console.error('Error loading guru:', error);
  }
}

function displayGuru(guruList) {
  const grid = document.getElementById('guruGrid');
  grid.innerHTML = '';
  
  guruList.forEach(guru => {
    const card = document.createElement('div');
    card.className = 'guru-card';
    card.innerHTML = `
      <div class="guru-avatar">
        ${guru.foto ? `<img src="${guru.foto}" alt="${guru.nama}">` : guru.nama.charAt(0)}
      </div>
      <h3>${guru.nama}</h3>
      <p>${guru.nip || 'N/A'}</p>
      <div class="jam-kerja" id="jamKerja-${guru.id}">Total Jam: -</div>
      <div class="button-group">
        <button class="btn-masuk" onclick="openAbsenModal('${guru.id}', '${guru.nama}', 'masuk')">Masuk</button>
        <button class="btn-pulang" onclick="openAbsenModal('${guru.id}', '${guru.nama}', 'pulang')">Pulang</button>
      </div>
    `;
    grid.appendChild(card);
  });
  
  updateJamKerja();
}

// Search Guru
document.getElementById('searchGuru').addEventListener('input', async (e) => {
  const search = e.target.value.toLowerCase();
  const response = await fetch(`${API_BASE}/guru`);
  const guruList = await response.json();
  const filtered = guruList.filter(g => g.nama.toLowerCase().includes(search));
  displayGuru(filtered);
});

// Open Absen Modal
function openAbsenModal(guruId, guruName, tab = 'masuk') {
  currentGuruId = guruId;
  currentTab = tab;
  document.getElementById('guruNameModal').textContent = guruName;
  document.getElementById('absenModal').style.display = 'block';
  
  // Set active tab
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(tab).classList.add('active');
  
  // Start camera
  setTimeout(() => {
    if (tab === 'masuk') {
      startCamera('videoCameraMasuk');
    } else if (tab === 'pulang') {
      startCamera('videoCameraPulang');
    }
  }, 100);
  
  // Get location
  getLocation();
}

// Get Geolocation
function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        currentLokasi = `${latitude},${longitude}`;
        document.getElementById('lokasi-masuk').textContent = `📍 Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
        document.getElementById('lokasi-pulang').textContent = `📍 Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
      },
      (error) => {
        console.error('Geolocation error:', error);
        currentLokasi = 'Tidak tersedia';
      }
    );
  }
}

// Start Camera
function startCamera(videoId) {
  const video = document.getElementById(videoId);
  
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => {
      video.srcObject = stream;
      video.play();
    })
    .catch(error => {
      console.error('Camera error:', error);
      alert('Tidak dapat mengakses kamera');
    });
}

// Take Photo
function takePhoto(videoId, canvasId, previewId, isMasuk) {
  const video = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  
  const photoData = canvas.toDataURL('image/jpeg');
  if (isMasuk) {
    photoDataMasuk = photoData;
  } else {
    photoDataPulang = photoData;
  }
  
  const preview = document.getElementById(previewId);
  preview.src = photoData;
  preview.style.display = 'block';
  
  return photoData;
}

// Button Click Events
document.getElementById('takeMasukBtn')?.addEventListener('click', () => {
  takePhoto('videoCameraMasuk', 'canvasMasuk', 'fotoMasukPreview', true);
  document.getElementById('submitMasukBtn').style.display = 'block';
});

document.getElementById('takePulangBtn')?.addEventListener('click', () => {
  takePhoto('videoCameraPulang', 'canvasPulang', 'fotoPulangPreview', false);
  document.getElementById('submitPulangBtn').style.display = 'block';
});

// Submit Absensi
async function submitAbsensi(tipe) {
  if (!currentGuruId) return alert('Guru ID not set');
  
  const photoData = tipe === 'masuk' ? photoDataMasuk : photoDataPulang;
  if (!photoData) return alert('Silakan ambil foto terlebih dahulu');
  
  try {
    const formData = new FormData();
    formData.append('guru_id', currentGuruId);
    formData.append('tipe', tipe);
    formData.append('lokasi', currentLokasi);
    
    // Convert base64 to blob
    const blob = await fetch(photoData).then(r => r.blob());
    formData.append('foto', blob, `${tipe}_${Date.now()}.jpg`);
    
    const response = await fetch(`${API_BASE}/absensi`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      alert(`Absensi ${tipe} berhasil dicatat`);
      closeModal();
      loadGuru();
    } else {
      alert('Gagal mencatat absensi');
    }
  } catch (error) {
    console.error('Error submitting absensi:', error);
    alert('Error: ' + error.message);
  }
}

document.getElementById('submitMasukBtn')?.addEventListener('click', () => submitAbsensi('masuk'));
document.getElementById('submitPulangBtn')?.addEventListener('click', () => submitAbsensi('pulang'));

// Submit Status Absensi (Sakit, Ijin, Dinas)
async function submitStatusAbsensi(status) {
  // Implementation for sakit, ijin, dinas
  const keterangan = document.getElementById(`keter${status}`)?.value || '';
  const tgl = document.getElementById(`tgl${status}`)?.value || new Date().toISOString().split('T')[0];
  
  try {
    const response = await fetch(`${API_BASE}/absensi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guru_id: currentGuruId,
        tipe: status.toLowerCase(),
        tanggal: tgl,
        status: status,
        keterangan: keterangan
      })
    });
    
    if (response.ok) {
      alert(`${status} berhasil dicatat`);
      closeModal();
      loadGuru();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Tab Navigation
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const tab = e.target.dataset.tab;
    currentTab = tab;
    
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(tab).classList.add('active');
    
    if (tab === 'masuk') {
      startCamera('videoCameraMasuk');
    } else if (tab === 'pulang') {
      startCamera('videoCameraPulang');
    }
  });
});

// Close Modal
function closeModal() {
  document.getElementById('absenModal').style.display = 'none';
  // Stop all cameras
  document.querySelectorAll('video').forEach(video => {
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
  });
}

document.querySelector('.close').addEventListener('click', closeModal);

window.addEventListener('click', (event) => {
  const modal = document.getElementById('absenModal');
  if (event.target === modal) {
    closeModal();
  }
});

// Update Total Jam Kerja
async function updateJamKerja() {
  const today = new Date().toISOString().split('T')[0];
  const response = await fetch(`${API_BASE}/guru`);
  const guruList = await response.json();
  
  for (const guru of guruList) {
    try {
      const absenResponse = await fetch(`${API_BASE}/absensi/${guru.id}/0/0`);
      // Implementation for calculating total hours
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

// Load guru on page load
loadGuru();
