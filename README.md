# Sistem Absensi Online SMK Penus

Aplikasi absensi online untuk guru SMK Penus dengan fitur lengkap:

## Fitur Utama

✅ Dashboard guru dengan grid interaktif  
✅ Absen masuk/pulang dengan kamera  
✅ Perjalanan dinas, sakit, ijin  
✅ QR Code & link absen mandiri  
✅ Geolocation otomatis  
✅ Profil guru dengan foto  
✅ Tambah guru baru  
✅ Rekap absensi bulanan (print)  
✅ Password admin yang bisa di-edit  
✅ Logo & nama sekolah bisa di-edit  

## Instalasi

1. Clone repository ini
2. `npm install`
3. Buat file `.env`
4. `npm run dev` untuk development

## Struktur Folder

```
smk-penus/
├── public/           # File frontend (HTML, CSS, JS)
├── data/             # Database SQLite
├── uploads/          # Folder upload foto
├── server.js         # Server utama
├── package.json
└── README.md
```

## Teknologi

- Frontend: HTML5, CSS3, JavaScript vanilla
- Backend: Node.js + Express
- Database: SQLite3
- Camera: getUserMedia API
- Location: Geolocation API
- QR Code: qrcode library

## Deploy

Deploy ke Netlify dengan menghubungkan repository ini.
