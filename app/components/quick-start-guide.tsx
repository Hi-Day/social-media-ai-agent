"use client";

type QuickStartGuideProps = {
  brandConfigured: boolean;
  draftCount: number;
  onOpenBrandBrain: () => void;
  onOpenAIStudio: () => void;
  onOpenCampaigns: () => void;
};

export default function QuickStartGuide({
  brandConfigured,
  draftCount,
  onOpenBrandBrain,
  onOpenAIStudio,
  onOpenCampaigns,
}: QuickStartGuideProps) {
  return (
    <section className="panel" aria-labelledby="quick-start-title" style={{ marginBottom: 16 }}>
      <div className="panel-head">
        <div>
          <small>QUICK START</small>
          <h3 id="quick-start-title">Mulai dalam 3 langkah</h3>
        </div>
        <span className="status">Panduan awal</span>
      </div>

      <p style={{ marginTop: 0, color: "var(--muted, #667085)" }}>
        Anda sudah masuk. Mulai dari pengaturan brand, lalu buat konten pertama. Anda tidak perlu menghubungkan akun sosial untuk mencoba pembuatan draft.
      </p>

      <div className="integration-list">
        <div className="draft-row">
          <div className="platform">1</div>
          <div className="draft-copy">
            <b>Atur Brand Brain</b>
            <small>{brandConfigured ? "Identitas brand sudah memiliki panduan dasar." : "Tambahkan deskripsi bisnis, target audiens, atau gaya bahasa agar konten lebih relevan."}</small>
          </div>
          <button onClick={onOpenBrandBrain}>{brandConfigured ? "Periksa" : "Atur brand"}</button>
        </div>

        <div className="draft-row">
          <div className="platform">2</div>
          <div className="draft-copy">
            <b>Buat draft konten pertama</b>
            <small>{draftCount > 0 ? `${draftCount} draft tersimpan di workspace ini.` : "Masukkan ide atau brief, tekan Generate, lalu pilih Save draft."}</small>
          </div>
          <button className="primary" onClick={onOpenAIStudio}>{draftCount > 0 ? "Buat lagi" : "Coba AI Studio"}</button>
        </div>

        <div className="draft-row">
          <div className="platform">3</div>
          <div className="draft-copy">
            <b>Rencanakan campaign</b>
            <small>Buat beberapa paket konten dan lihat estimasi kredit sebelum menjalankan generasi.</small>
          </div>
          <button onClick={onOpenCampaigns}>Buka Campaigns</button>
        </div>
      </div>

      <p className="learning-note" style={{ marginBottom: 0 }}>
        Catatan: jika provider AI belum dikonfigurasi, SocialOS menggunakan mode demo. Status mode akan ditampilkan pada hasil generasi. Publikasi ke media sosial tetap memerlukan koneksi akun dan izin API yang sesuai.
      </p>
    </section>
  );
}
