import Link from "next/link";

export default async function BillingReturn({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const { result } = await searchParams;
  const cancelled = result === "cancelled";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">SocialOS Billing</p>
        <h1 className="mt-3 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {cancelled ? "Checkout belum diselesaikan" : "Kami sedang memverifikasi langganan"}
        </h1>
        <p className="mt-4 leading-7 text-neutral-600 dark:text-neutral-300">
          {cancelled
            ? "Anda kembali dari halaman checkout. Tidak ada akses berbayar yang diaktifkan oleh halaman redirect ini."
            : "Checkout selesai dikembalikan ke SocialOS, tetapi akses berbayar baru aktif setelah webhook Xendit terverifikasi. Halaman ini bukan bukti pembayaran berhasil."}
        </p>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          Jika status belum berubah, tunggu notifikasi provider atau hubungi administrator workspace. Jangan mengulangi pembayaran sebelum memeriksa status langganan.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Kembali ke SocialOS
        </Link>
      </div>
    </main>
  );
}
