# DB Migration & Disaster Readiness Runbook (PostgreSQL + Flyway)

## 1) Pre-deploy checklist

- [ ] **Release scope approved**: migration SQL dosyaları ve uygulama değişiklikleri gözden geçirildi.
- [ ] **Migration naming/version kontrolü**: `V{n}__description.sql` standardı korunuyor.
- [ ] **Drift kontrolü**: staging/prod `flyway_schema_history` kayıtları karşılaştırıldı, beklenmeyen fark yok.
- [ ] **DB backup alındı** (deploy öncesi): zaman damgalı `.dump` dosyası üretildi ve doğrulandı.
- [ ] **Rollback kararı hazır**: forward-fix mi backup-restore mu uygulanacağına dair ön karar net.
- [ ] **Change window**: deploy bakım penceresi/izleme sorumluları atandı.
- [ ] **Uygulama prod güvenlik ayarları** doğrulandı:
  - `spring.jpa.hibernate.ddl-auto` => `validate` veya `none`
  - `spring.flyway.clean-disabled=true`

---

## 2) Migration deploy adımları

1. **Backup al**
   - PowerShell:
     ```powershell
     .\scripts\db\backup-postgres.ps1 -EnvFile .\scripts\db\db.env
     ```
2. **Build ve temel doğrulama**
   - `cd backend`
   - `./mvnw test`
   - `./mvnw -DskipTests package`
3. **Prod profile ile deploy**
   - `SPRING_PROFILES_ACTIVE=prod`
   - Uygulama startup sırasında Flyway migration’lar otomatik uygulanır.
4. **Post-deploy check**
   - Uygulama health kontrolü
   - Kritik endpoint smoke test
   - `flyway_schema_history` tablosunda migration durum kontrolü (`success=true`)

---

## 3) Rollback stratejisi (karar ağacı)

### A) Öncelik: Forward-fix (önerilen)

Aşağıdaki şartlarda **forward-fix** tercih edilir:
- Veri kaybı yok
- Sadece şema/indeks/constraint davranışı düzeltmesi gerekiyor
- Kısa sürede yeni `V{n+1}` migration yazılabiliyor

**Adımlar:**
1. Sorunu izole et (hatalı migration adımı/SQL).
2. Yeni düzeltme migration’ı (`V{n+1}__...`) ekle.
3. Staging’de doğrula.
4. Prod’da kontrollü uygula.

### B) Backup restore / PITR (disaster path)

Aşağıdaki durumlarda restore/PITR değerlendir:
- Veri bütünlüğü bozuldu
- Kritik veri silinmesi/yanlış dönüşüm oluştu
- Forward-fix kabul edilebilir sürede riski düşürmüyor

**Karar**
- Son güvenli noktaya dönüş yeterliyse: **backup restore**
- Dakika/seviye hassas geri dönüş gerekiyorsa ve altyapı destekliyorsa: **PITR**

---

## 4) Incident anında adım adım recovery

1. **Incident ilanı ve değişiklik dondurma**
   - Yeni deploy/migration durdurulur.
2. **Etki analizi**
   - Etkilenen tablo/veri kapsamı belirlenir.
3. **Son iyi backup seçimi**
   - Tarih/saat ve doğrulama bilgisiyle en uygun dump dosyası seçilir.
4. **Restore dry-run komut doğrulaması**
   ```powershell
   .\scripts\db\restore-postgres.ps1 -EnvFile .\scripts\db\db.env -BackupFile <path-to-dump> -DryRun
   ```
5. **Restore uygula** (gerekiyorsa `-Clean`)
   ```powershell
   .\scripts\db\restore-postgres.ps1 -EnvFile .\scripts\db\db.env -BackupFile <path-to-dump> -Clean
   ```
6. **Uygulama doğrulama**
   - Health, login, kritik akışlar, veri doğruluğu
7. **Post-incident**
   - RCA (root cause analysis)
   - Kalıcı önlem: migration standardı/script/runbook güncellemesi

---

## 5) RTO / RPO pragmatik hedef önerisi

- **RPO hedefi (öneri):** 15-30 dakika
  - Her deploy öncesi zorunlu backup + düzenli zamanlanmış yedek.
- **RTO hedefi (öneri):** 60-120 dakika
  - Scriptleşmiş restore, net karar ağacı ve önceden test edilmiş runbook ile.

> Not: Kesin hedefler iş kritikliği, veri hacmi ve altyapı (PITR/WAL arşivleme) kapasitesine göre revize edilmelidir.

---

## 6) Operasyon komut özeti

- Backup (dry-run):
  ```powershell
  .\scripts\db\backup-postgres.ps1 -EnvFile .\scripts\db\db.env -DryRun
  ```
- Backup (real):
  ```powershell
  .\scripts\db\backup-postgres.ps1 -EnvFile .\scripts\db\db.env
  ```
- Restore (dry-run):
  ```powershell
  .\scripts\db\restore-postgres.ps1 -EnvFile .\scripts\db\db.env -BackupFile .\scripts\db\backups\bloomDb_YYYYMMDD-HHMMSS.dump -DryRun
  ```
- Restore (real):
  ```powershell
  .\scripts\db\restore-postgres.ps1 -EnvFile .\scripts\db\db.env -BackupFile .\scripts\db\backups\bloomDb_YYYYMMDD-HHMMSS.dump -Clean
  ```
