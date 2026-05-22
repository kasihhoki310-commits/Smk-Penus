const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Setup folder
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('data')) fs.mkdirSync('data');

// Multer untuk upload foto
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Database
const db = new sqlite3.Database('./data/absensi.db');

// Initialize Database
db.serialize(() => {
  // Tabel Guru
  db.run(`CREATE TABLE IF NOT EXISTS guru (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    nip TEXT UNIQUE,
    email TEXT,
    foto TEXT,
    qrcode TEXT,
    link_absen TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabel Absensi
  db.run(`CREATE TABLE IF NOT EXISTS absensi (
    id TEXT PRIMARY KEY,
    guru_id TEXT NOT NULL,
    tanggal DATE NOT NULL,
    jam_masuk TIME,
    jam_pulang TIME,
    foto_masuk TEXT,
    foto_pulang TEXT,
    lokasi_masuk TEXT,
    lokasi_pulang TEXT,
    status TEXT,
    keterangan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guru_id) REFERENCES guru(id)
  )`);

  // Tabel Konfigurasi
  db.run(`CREATE TABLE IF NOT EXISTS konfigurasi (
    id TEXT PRIMARY KEY,
    school_name TEXT,
    school_logo TEXT,
    admin_password TEXT,
    kepala_sekolah TEXT,
    wks_kurikulum TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default config
  db.get('SELECT * FROM konfigurasi LIMIT 1', (err, row) => {
    if (!row) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT INTO konfigurasi VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuidv4(), 'SMK Penus Bebas', '', hashedPassword, 'Kepala Sekolah', 'WKS Kurikulum']
      );
    }
  });
});

// ==================== API ROUTES ====================

// 1. GET Konfigurasi Sekolah
app.get('/api/config', (req, res) => {
  db.get('SELECT * FROM konfigurasi LIMIT 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

// 2. UPDATE Konfigurasi
app.post('/api/config', (req, res) => {
  const { admin_password, school_name, kepala_sekolah, wks_kurikulum } = req.body;
  
  db.get('SELECT * FROM konfigurasi LIMIT 1', (err, row) => {
    if (!row) return res.status(404).json({ error: 'Config not found' });
    
    const hashedPassword = admin_password ? bcrypt.hashSync(admin_password, 10) : row.admin_password;
    
    db.run(
      `UPDATE konfigurasi SET school_name = ?, admin_password = ?, kepala_sekolah = ?, wks_kurikulum = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [school_name, hashedPassword, kepala_sekolah, wks_kurikulum, row.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Konfigurasi updated' });
      }
    );
  });
});

// 3. GET Semua Guru
app.get('/api/guru', (req, res) => {
  db.all('SELECT * FROM guru ORDER BY nama', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 4. GET Detail Guru
app.get('/api/guru/:id', (req, res) => {
  db.get('SELECT * FROM guru WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Guru not found' });
    res.json(row);
  });
});

// 5. TAMBAH Guru Baru
app.post('/api/guru', (req, res) => {
  const { nama, nip, email } = req.body;
  const id = uuidv4();
  const linkAbsen = `${process.env.BASE_URL || 'http://localhost:3000'}/absen/${id}`;
  
  db.run(
    `INSERT INTO guru (id, nama, nip, email, link_absen) VALUES (?, ?, ?, ?, ?)`,
    [id, nama, nip, email, linkAbsen],
    async (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Generate QR Code
      try {
        const qrPath = `uploads/qr_${id}.png`;
        await QRCode.toFile(qrPath, linkAbsen);
        db.run('UPDATE guru SET qrcode = ? WHERE id = ?', [qrPath, id]);
      } catch (e) {
        console.error('QR Code error:', e);
      }
      
      res.json({ id, nama, nip, email, link_absen: linkAbsen, message: 'Guru added' });
    }
  );
});

// 6. EDIT Guru
app.put('/api/guru/:id', upload.single('foto'), (req, res) => {
  const { nama, email } = req.body;
  const fotoPath = req.file ? req.file.path : null;
  
  if (fotoPath) {
    db.run(
      `UPDATE guru SET nama = ?, email = ?, foto = ? WHERE id = ?`,
      [nama, email, fotoPath, req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Guru updated with photo' });
      }
    );
  } else {
    db.run(
      `UPDATE guru SET nama = ?, email = ? WHERE id = ?`,
      [nama, email, req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Guru updated' });
      }
    );
  }
});

// 7. DELETE Guru
app.delete('/api/guru/:id', (req, res) => {
  db.run('DELETE FROM guru WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Guru deleted' });
  });
});

// 8. ABSEN MASUK/PULANG
app.post('/api/absensi', upload.single('foto'), (req, res) => {
  const { guru_id, tipe, lokasi, tanggal } = req.body; // tipe: 'masuk' atau 'pulang'
  const fotoPath = req.file ? req.file.path : null;
  const jamSekarang = new Date().toLocaleTimeString('id-ID', { hour12: false });
  const tanggalAbsen = tanggal || new Date().toISOString().split('T')[0];
  
  // Cek apakah sudah ada absensi hari ini
  db.get(
    'SELECT * FROM absensi WHERE guru_id = ? AND tanggal = ?',
    [guru_id, tanggalAbsen],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (row) {
        // Update absensi yang sudah ada
        if (tipe === 'masuk') {
          db.run(
            `UPDATE absensi SET jam_masuk = ?, foto_masuk = ?, lokasi_masuk = ? WHERE id = ?`,
            [jamSekarang, fotoPath, lokasi, row.id],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ message: 'Absensi masuk recorded', jam: jamSekarang });
            }
          );
        } else if (tipe === 'pulang') {
          db.run(
            `UPDATE absensi SET jam_pulang = ?, foto_pulang = ?, lokasi_pulang = ? WHERE id = ?`,
            [jamSekarang, fotoPath, lokasi, row.id],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ message: 'Absensi pulang recorded', jam: jamSekarang });
            }
          );
        }
      } else {
        // Buat absensi baru
        const id = uuidv4();
        let jamMasuk = null, jamPulang = null, fotoMasukPath = null, fotoPulangPath = null;
        let lokasiMasuk = null, lokasiPulang = null;
        
        if (tipe === 'masuk') {
          jamMasuk = jamSekarang;
          fotoMasukPath = fotoPath;
          lokasiMasuk = lokasi;
        } else if (tipe === 'pulang') {
          jamPulang = jamSekarang;
          fotoPulangPath = fotoPath;
          lokasiPulang = lokasi;
        }
        
        db.run(
          `INSERT INTO absensi (id, guru_id, tanggal, jam_masuk, jam_pulang, foto_masuk, foto_pulang, lokasi_masuk, lokasi_pulang, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, guru_id, tanggalAbsen, jamMasuk, jamPulang, fotoMasukPath, fotoPulangPath, lokasiMasuk, lokasiPulang, 'Masuk'],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `Absensi ${tipe} recorded`, jam: jamSekarang });
          }
        );
      }
    }
  );
});

// 9. GET Absensi per Guru per Bulan
app.get('/api/absensi/:guru_id/:bulan/:tahun', (req, res) => {
  const { guru_id, bulan, tahun } = req.params;
  const bulanTahun = `${tahun}-${String(bulan).padStart(2, '0')}%`;
  
  db.all(
    'SELECT * FROM absensi WHERE guru_id = ? AND tanggal LIKE ? ORDER BY tanggal',
    [guru_id, bulanTahun],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// 10. GET Laporan Bulanan (Semua Guru)
app.get('/api/laporan/:bulan/:tahun', (req, res) => {
  const { bulan, tahun } = req.params;
  const bulanTahun = `${tahun}-${String(bulan).padStart(2, '0')}%`;
  
  db.all(
    `SELECT g.nama, a.tanggal, a.jam_masuk, a.jam_pulang, a.status, a.keterangan
     FROM guru g
     LEFT JOIN absensi a ON g.id = a.guru_id AND a.tanggal LIKE ?
     ORDER BY g.nama, a.tanggal`,
    [bulanTahun],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// 11. UPDATE Status Absensi (sakit, ijin, dinas)
app.put('/api/absensi/:id', (req, res) => {
  const { status, keterangan } = req.body;
  db.run(
    `UPDATE absensi SET status = ?, keterangan = ? WHERE id = ?`,
    [status, keterangan, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Status updated' });
    }
  );
});

// 12. Verify Admin Password
app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  db.get('SELECT admin_password FROM konfigurasi LIMIT 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Config not found' });
    
    const isValid = bcrypt.compareSync(password, row.admin_password);
    res.json({ valid: isValid });
  });
});

// 13. Serve Frontend Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/absen/:guru_id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'absen-mandiri.html'));
});

app.get('/laporan', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'laporan.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
