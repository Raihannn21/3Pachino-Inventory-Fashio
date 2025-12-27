# Setup Xprinter untuk Web USB API

Karena Web USB API tidak bisa mengakses printer yang di-claim oleh Windows driver, Anda perlu menggunakan salah satu solusi berikut:

## ✅ Solusi 1: Stop Windows Print Spooler (Sementara)

**Buka PowerShell sebagai Administrator**, lalu jalankan:

```powershell
# Stop Print Spooler service
Stop-Service -Name Spooler -Force

# Cek status (harus "Stopped")
Get-Service -Name Spooler
```

Setelah itu, coba connect Xprinter dari browser.

**Untuk mengembalikan:**
```powershell
# Start Print Spooler lagi
Start-Service -Name Spooler
```

⚠️ **WARNING**: Selama Spooler di-stop, SEMUA printer Windows tidak bisa dipakai!

---

## ✅ Solusi 2: Zadig - Replace Driver (Recommended untuk Development)

Download Zadig: https://zadig.akeo.ie/

**Langkah-langkah:**

1. **Disconnect printer** dari USB
2. **Uninstall printer** dari Windows (Settings → Printers & Scanners → Remove)
3. **Jalankan Zadig sebagai Administrator**
4. **Colok printer** ke USB
5. Di Zadig:
   - Klik **Options → List All Devices**
   - Pilih printer Xprinter dari dropdown
   - Pastikan driver target adalah **WinUSB** atau **libusbK**
   - Klik **Install Driver** atau **Replace Driver**
6. Tunggu sampai selesai
7. **Restart browser**
8. Coba connect dari web app

⚠️ **PENTING**: Setelah install WinUSB driver:
- Printer TIDAK bisa dipakai dari aplikasi Windows biasa
- Hanya bisa diakses via Web USB API
- Untuk restore: uninstall device di Device Manager, lalu reinstall driver original

---

## ✅ Solusi 3: Disable Device di Device Manager

1. Buka **Device Manager** (Win + X → Device Manager)
2. Cari printer di:
   - **Printers**
   - **Universal Serial Bus devices**
   - **USB Printing Support** atau sejenisnya
3. Klik kanan device → **Disable device**
4. Coba connect dari browser
5. Jika selesai: klik kanan → **Enable device**

---

## 🚀 Cara Tercepat (Untuk Testing):

```powershell
# Jalankan sebagai Administrator
Stop-Service -Name Spooler -Force
```

Lalu coba connect Xprinter dari browser. Jika berhasil:

```powershell
# Kembalikan setelah selesai testing
Start-Service -Name Spooler
```

---

## 📝 Catatan:

- Web USB API **tidak bisa sharing** device dengan Windows driver
- Ini limitasi dari WebUSB specification, bukan bug di code
- Untuk production, pertimbangkan:
  - Gunakan **Electron app** dengan node-usb (full access)
  - Gunakan **backend service** yang handle USB printing
  - Atau pakai **dedicated printer** khusus untuk web app (dengan Zadig driver)
