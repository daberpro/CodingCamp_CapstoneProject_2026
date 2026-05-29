<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getCurrentUser, googleLoginUrl, loginWithEmail } from '$lib/api.js';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let isLoading = $state(false);
	let isChecking = $state(true);

	onMount(async () => {
		error = sessionStorage.getItem('auth_error') || '';
		sessionStorage.removeItem('auth_error');
		try {
			const user = await getCurrentUser();
			if (user) await goto('/dashboard');
		} catch (sessionError) {
			if (!error && sessionError.message) error = sessionError.message;
		} finally {
			isChecking = false;
		}
	});

	async function submitLogin(event) {
		event.preventDefault();
		error = '';
		isLoading = true;

		try {
			await loginWithEmail({ email, password });
			await goto('/dashboard');
		} catch (loginError) {
			error = loginError.message || 'Email atau password tidak valid.';
		} finally {
			isLoading = false;
		}
	}
</script>

{#if isChecking}
	<div class="grid min-h-screen place-items-center bg-[#f4f7f6] text-slate-500">Memeriksa sesi...</div>
{:else}
	<main class="grid min-h-screen bg-[#f4f7f6] lg:grid-cols-[1.05fr_0.95fr]">
		<section class="hidden bg-forest p-12 text-white lg:flex lg:flex-col">
			<div class="text-4xl font-extrabold text-brand">Pitakado</div>
			<div class="mt-auto max-w-xl">
				<p class="text-sm font-bold uppercase tracking-[0.28em] text-brand">Cashier Intelligence</p>
				<h1 class="mt-5 text-5xl font-extrabold leading-tight">Kelola kasir, laporan, dan prediksi stok dari data asli.</h1>
				<p class="mt-6 text-lg leading-8 text-emerald-50/75">
					Masuk untuk memuat data backend dan endpoint AI. Dashboard hanya menampilkan data live, jadi kondisi kosong berarti endpoint belum mengirim data.
				</p>
			</div>
		</section>

		<section class="flex items-center justify-center p-6">
			<div class="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
				<div class="mb-8">
					<p class="text-3xl font-extrabold text-brand lg:hidden">Pitakado</p>
					<h2 class="mt-4 text-3xl font-bold text-ink">Masuk ke Dashboard</h2>
					<p class="mt-2 text-slate-500">Gunakan akun yang sudah terdaftar di backend.</p>
				</div>

				<form class="space-y-4" onsubmit={submitLogin}>
					<label class="block">
						<span class="mb-2 block text-sm font-bold text-slate-600">Email</span>
						<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" bind:value={email} type="email" autocomplete="email" required />
					</label>
					<label class="block">
						<span class="mb-2 block text-sm font-bold text-slate-600">Password</span>
						<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" bind:value={password} type="password" autocomplete="current-password" required />
					</label>
					{#if error}
						<p class="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
					{/if}
					<button class="w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white disabled:bg-slate-300" disabled={isLoading}>
						{isLoading ? 'Memproses...' : 'Masuk'}
					</button>
				</form>

				<a class="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 px-5 py-4 font-bold" href={googleLoginUrl}>
					<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
						<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
						<path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
						<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
						<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
					</svg>
					Lanjutkan dengan Google
				</a>
			</div>
		</section>
	</main>
{/if}
