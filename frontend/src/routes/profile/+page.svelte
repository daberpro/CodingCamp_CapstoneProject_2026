<script>
	import { onMount } from 'svelte';
	import { getCurrentUser, updateUser } from '$lib/api.js';
	import Icon from '$lib/components/Icon.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import SkeletonScreen from '$lib/components/SkeletonScreen.svelte';
	import { getAvatarUrl, getDisplayName, getInitials } from '$lib/utils/format.js';

	let isLoading = $state(true);
	let isSaving = $state(false);
	let user = $state(null);
	let form = $state({
		username: '',
		avatar_url: '',
		password: ''
	});
	let error = $state('');
	let toast = $state('');

	let displayName = $derived(getDisplayName(user));
	let initials = $derived(getInitials(displayName));
	let previewAvatarUrl = $derived(getAvatarUrl({ avatar_url: form.avatar_url }));

	onMount(loadProfile);

	async function loadProfile() {
		isLoading = true;
		error = '';

		try {
			user = await getCurrentUser();
			form = {
				username: user?.username || getDisplayName(user),
				avatar_url: user?.avatar_url || '',
				password: ''
			};
		} catch (loadError) {
			error = loadError.message || 'Gagal memuat profil.';
		} finally {
			isLoading = false;
		}
	}

	async function submitProfile(event) {
		event.preventDefault();
		if (!user?.id || isSaving) return;

		isSaving = true;
		error = '';
		toast = '';

		const payload = {
			username: form.username,
			avatar_url: form.avatar_url || null
		};
		if (form.password) payload.password = form.password;

		try {
			await updateUser(user.id, payload);
			toast = 'Profil berhasil diperbarui.';
			await loadProfile();
		} catch (saveError) {
			error = saveError.message || 'Gagal memperbarui profil.';
		} finally {
			isSaving = false;
		}
	}
</script>

{#if isLoading}
	<SkeletonScreen />
{:else}
	<div class="mx-auto max-w-5xl">
			<PageTitle title="Profil User" subtitle="Perbarui informasi akun pribadi" icon="users" />

			{#if error}
				<div class="mb-6 rounded-2xl bg-red-50 px-5 py-4 font-semibold text-red-700">{error}</div>
			{/if}

			<div class="grid gap-8 lg:grid-cols-[22rem_1fr]">
				<section class="rounded-3xl bg-white p-6 text-center shadow-sm">
					<div class="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-emerald-100 text-3xl font-extrabold text-emerald-700">
						{#if previewAvatarUrl}
							<img class="h-full w-full object-cover" src={previewAvatarUrl} alt="" />
						{:else}
							{initials}
						{/if}
					</div>
					<h2 class="mt-5 text-2xl font-bold">{displayName}</h2>
					<p class="mt-1 text-slate-500">{user?.email || '-'}</p>
					<div class="mt-5 flex flex-wrap justify-center gap-2">
						<span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{user?.roles || '-'}</span>
						<span class={`rounded-full px-3 py-1 text-sm font-bold ${user?.roles === 'super-admin' || user?.status_verified === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
							{user?.roles === 'super-admin' ? 'verified' : user?.status_verified || '-'}
						</span>
					</div>
				</section>

				<form class="rounded-3xl bg-white p-6 shadow-sm sm:p-8" onsubmit={submitProfile}>
					<div class="mb-6 flex items-center gap-3">
						<span class="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
							<Icon name="edit" />
						</span>
						<div>
							<h2 class="text-2xl font-bold">Edit Profil</h2>
							<p class="text-slate-500">Email dan role mengikuti data backend dan tidak bisa diubah dari halaman ini.</p>
						</div>
					</div>

					<div class="grid gap-5">
						<label class="block">
							<span class="mb-2 block text-sm font-bold text-slate-600">Username</span>
							<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" bind:value={form.username} required />
						</label>

						<div class="grid gap-5 sm:grid-cols-2">
							<label class="block">
								<span class="mb-2 block text-sm font-bold text-slate-600">Email</span>
								<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 text-slate-500 outline-none" value={user?.email || ''} disabled />
							</label>
							<label class="block">
								<span class="mb-2 block text-sm font-bold text-slate-600">Role</span>
								<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 text-slate-500 outline-none" value={user?.roles || ''} disabled />
							</label>
						</div>

						<label class="block">
							<span class="mb-2 block text-sm font-bold text-slate-600">Avatar URL</span>
							<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" bind:value={form.avatar_url} type="url" placeholder="https://example.com/avatar.jpg" />
						</label>

						<label class="block">
							<span class="mb-2 block text-sm font-bold text-slate-600">Password Baru</span>
							<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" bind:value={form.password} type="password" placeholder="Kosongkan jika tidak diubah" />
						</label>
					</div>

					<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						{#if toast}
							<p class="font-semibold text-emerald-700">{toast}</p>
						{:else}
							<span></span>
						{/if}
						<button class="rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white disabled:bg-slate-300" disabled={isSaving}>
							{isSaving ? 'Menyimpan...' : 'Simpan Profil'}
						</button>
					</div>
				</form>
			</div>
	</div>
{/if}
