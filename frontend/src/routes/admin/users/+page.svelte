<script>
	import { onMount } from 'svelte';
	import {
		createUser,
		deleteUser,
		getAllUsers,
		getCurrentUser,
		updateUser,
		updateUserVerification
	} from '$lib/api.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import SkeletonScreen from '$lib/components/SkeletonScreen.svelte';
	import TablePagination from '$lib/components/TablePagination.svelte';
	import { getAvatarUrl, getDisplayName, getInitials } from '$lib/utils/format.js';

	const emptyForm = {
		id: null,
		username: '',
		email: '',
		password: '',
		roles: 'kasir',
		avatar_url: '',
		status_verified: 'not-verified'
	};

	let users = $state([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state('');
	let toast = $state('');
	let currentUser = $state(null);
	let search = $state('');
	let roleFilter = $state('Semua');
	let statusFilter = $state('Semua');
	let formOpen = $state(false);
	let form = $state({ ...emptyForm });
	let page = $state(1);
	let pageSize = $state(10);

	let isSuperAdmin = $derived(currentUser?.roles === 'super-admin');
	let isAdmin = $derived(['admin', 'super-admin'].includes(currentUser?.roles));
	let filteredUsers = $derived(
		users.filter((user) => {
			const roleMatch = roleFilter === 'Semua' || user.roles === roleFilter;
			const statusMatch = statusFilter === 'Semua' || verifiedStatus(user) === statusFilter;
			const searchMatch = [user.username, user.email, user.roles, user.status_verified]
				.join(' ')
				.toLowerCase()
				.includes(search.trim().toLowerCase());
			return roleMatch && statusMatch && searchMatch;
		})
	);
	let paginatedUsers = $derived(filteredUsers.slice((page - 1) * pageSize, page * pageSize));

	$effect(() => {
		search;
		roleFilter;
		statusFilter;
		page = 1;
	});

	onMount(loadUsers);

	async function loadUsers() {
		isLoading = true;
		error = '';

		try {
			const [activeUser, userRows] = await Promise.all([getCurrentUser(), getAllUsers()]);
			currentUser = activeUser;
			users = userRows;
		} catch (loadError) {
			error = loadError.message || 'Gagal memuat daftar user.';
		} finally {
			isLoading = false;
		}
	}

	function openCreateForm() {
		form = { ...emptyForm };
		formOpen = true;
	}

	$effect(() => {
		if (form.roles === 'super-admin' && form.status_verified !== 'verified') {
			form = { ...form, status_verified: 'verified' };
		}
	});

	function openEditForm(user) {
		form = {
			id: user.id,
			username: user.username || getDisplayName(user),
			email: user.email || '',
			password: '',
			roles: user.roles || 'kasir',
			avatar_url: user.avatar_url || '',
			status_verified: user.status_verified || 'not-verified'
		};
		formOpen = true;
	}

	function isSelf(user) {
		return String(currentUser?.id) === String(user?.id);
	}

	function canEdit(user) {
		return isSuperAdmin || isSelf(user);
	}

	function canDelete(user) {
		if (isSelf(user)) return false;
		if (isSuperAdmin) return true;
		return currentUser?.roles === 'admin' && user?.roles === 'kasir';
	}

	function canChangeVerification(user) {
		return isAdmin && !isSelf(user) && user?.roles !== 'super-admin';
	}

	function verifiedStatus(user) {
		return user?.roles === 'super-admin' ? 'verified' : user?.status_verified || 'not-verified';
	}

	function closeForm() {
		formOpen = false;
		form = { ...emptyForm };
	}

	async function submitUser(event) {
		event.preventDefault();
		isSaving = true;
		error = '';

		const payload = {
			username: form.username,
			email: form.email,
			avatar_url: form.avatar_url || null
		};
		if (form.password) payload.password = form.password;
		if (!form.id || (isSuperAdmin && String(currentUser?.id) !== String(form.id))) {
			payload.roles = form.roles;
		}

		try {
			if (form.id) {
				await updateUser(form.id, payload);
				toast = 'User berhasil diperbarui.';
			} else {
				const createdUser = await createUser({
					username: payload.username,
					email: payload.email,
					password: form.password,
					roles: form.roles,
					avatar_url: payload.avatar_url
				});
				if ((form.status_verified === 'verified' || form.roles === 'super-admin') && createdUser?.id) {
					await updateUserVerification(createdUser.id, 'verified');
				}
				toast = 'User berhasil ditambahkan.';
			}
			closeForm();
			await loadUsers();
		} catch (saveError) {
			error = saveError.message || 'Gagal menyimpan user.';
		} finally {
			isSaving = false;
		}
	}

	async function removeUser(user) {
		if (!canDelete(user)) return;
		const confirmed = window.confirm(`Hapus user ${user.username || user.email}?`);
		if (!confirmed) return;

		error = '';
		try {
			await deleteUser(user.id);
			toast = 'User berhasil dihapus.';
			await loadUsers();
		} catch (deleteError) {
			error = deleteError.message || 'Gagal menghapus user.';
		}
	}

	async function toggleVerification(user) {
		if (!canChangeVerification(user)) return;
		const nextStatus = verifiedStatus(user) === 'verified' ? 'not-verified' : 'verified';
		error = '';

		try {
			await updateUserVerification(user.id, nextStatus);
			toast = nextStatus === 'verified' ? 'User berhasil diverifikasi.' : 'Verifikasi user dibatalkan.';
			await loadUsers();
		} catch (statusError) {
			error = statusError.message || 'Gagal mengubah status verifikasi.';
		}
	}

	function createdAt(value) {
		if (!value) return '-';
		return new Date(value).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

{#if isLoading}
	<SkeletonScreen />
{:else}
	<div class="flex flex-col gap-6">
			<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<PageTitle title="Manajemen User" subtitle="Kelola akun, role, dan status verifikasi" icon="users" />
				<button class="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white" onclick={openCreateForm}>
					<Icon name="plus" size={18} /> Tambah User
				</button>
			</div>

			{#if error}
				<div class="rounded-2xl bg-red-50 px-5 py-4 font-semibold text-red-700">{error}</div>
			{/if}

			<section class="rounded-3xl bg-white p-5 shadow-sm">
				<div class="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
					<label class="flex items-center gap-3 rounded-2xl bg-slate-100 px-5 py-4 text-slate-400">
						<Icon name="search" size={20} />
						<input class="w-full bg-transparent text-slate-700 outline-none" bind:value={search} placeholder="Cari nama, email, role..." />
					</label>
					<select class="rounded-2xl bg-slate-100 px-5 py-4 font-semibold outline-none" bind:value={roleFilter}>
						<option>Semua</option>
						<option>super-admin</option>
						<option>admin</option>
						<option>kasir</option>
					</select>
					<select class="rounded-2xl bg-slate-100 px-5 py-4 font-semibold outline-none" bind:value={statusFilter}>
						<option>Semua</option>
						<option value="verified">Verified</option>
						<option value="not-verified">Not Verified</option>
					</select>
				</div>
			</section>

			<section class="rounded-3xl bg-white shadow-sm">
				{#if filteredUsers.length === 0}
					<div class="p-6">
						<EmptyState title="User tidak ditemukan" message="Tidak ada user yang cocok dengan filter saat ini." />
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="min-w-full text-left">
							<thead class="text-sm uppercase tracking-wide text-slate-400">
								<tr>
									<th class="px-6 py-4">User</th>
									<th class="px-6 py-4">Role</th>
									<th class="px-6 py-4">Status</th>
									<th class="px-6 py-4">Dibuat</th>
									<th class="px-6 py-4 text-right">Aksi</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100">
								{#each paginatedUsers as user}
									<tr>
										<td class="px-6 py-5">
											<div class="flex items-center gap-4">
												{#if getAvatarUrl(user)}
													<img class="h-12 w-12 rounded-full object-cover" src={getAvatarUrl(user)} alt="" />
												{:else}
													<span class="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">{getInitials(getDisplayName(user))}</span>
												{/if}
												<div>
													<p class="font-bold">{getDisplayName(user)}</p>
													<p class="text-sm text-slate-500">{user.email || '-'}</p>
												</div>
											</div>
										</td>
										<td class="px-6 py-5">
											<span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{user.roles || '-'}</span>
										</td>
										<td class="px-6 py-5">
											<span class={`rounded-full px-3 py-1 text-sm font-bold ${verifiedStatus(user) === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
												{verifiedStatus(user) === 'verified' ? 'Verified' : 'Not Verified'}
											</span>
										</td>
										<td class="px-6 py-5 text-slate-600">{createdAt(user.created_at)}</td>
										<td class="px-6 py-5">
											<div class="flex justify-end gap-2">
												{#if canEdit(user)}
													<button class="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700" title="Edit" onclick={() => openEditForm(user)}>
														<Icon name="edit" size={18} />
													</button>
												{/if}
												{#if canChangeVerification(user)}
													<button
														class={`grid h-10 w-10 place-items-center rounded-xl ${verifiedStatus(user) === 'verified' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}
														title={verifiedStatus(user) === 'verified' ? 'Batalkan verifikasi' : 'Verifikasi user'}
														onclick={() => toggleVerification(user)}
													>
														<Icon name={verifiedStatus(user) === 'verified' ? 'x' : 'check'} size={18} />
													</button>
												{/if}
												{#if canDelete(user)}
													<button class="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700" title="Hapus user" onclick={() => removeUser(user)}>
														<Icon name="trash" size={18} />
													</button>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<TablePagination total={filteredUsers.length} bind:page bind:pageSize />
				{/if}
			</section>
	</div>

	{#if formOpen}
		<div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
				<form class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-soft sm:p-8" onsubmit={submitUser}>
					<div class="mb-6 flex items-center justify-between gap-4">
						<div>
							<h2 class="text-2xl font-bold">{form.id ? 'Edit User' : 'Tambah User'}</h2>
							<p class="text-slate-500">{form.id ? 'Perbarui data akun yang dipilih.' : 'Buat akun baru untuk admin atau kasir.'}</p>
						</div>
						<button type="button" class="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" onclick={closeForm}>
							<Icon name="x" size={18} />
						</button>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<label class="block">
							<span class="mb-2 block text-sm font-bold text-slate-600">Username</span>
							<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" bind:value={form.username} required />
						</label>
						<label class="block">
							<span class="mb-2 block text-sm font-bold text-slate-600">Email</span>
							<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" bind:value={form.email} type="email" required />
						</label>
						<label class="block">
							<span class="mb-2 block text-sm font-bold text-slate-600">Password</span>
							<input
								class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand"
								bind:value={form.password}
								type="password"
								required={!form.id}
								placeholder={form.id ? 'Kosongkan jika tidak diubah' : ''}
							/>
						</label>
						<label class="block">
							<span class="mb-2 block text-sm font-bold text-slate-600">Role</span>
							<select class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand disabled:text-slate-400" bind:value={form.roles} disabled={form.id && !isSuperAdmin}>
								<option value="kasir">kasir</option>
								<option value="admin">admin</option>
								{#if isSuperAdmin}
									<option value="super-admin">super-admin</option>
								{/if}
							</select>
						</label>
						<label class="block sm:col-span-2">
							<span class="mb-2 block text-sm font-bold text-slate-600">Avatar URL</span>
							<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" bind:value={form.avatar_url} type="url" />
						</label>
						{#if !form.id}
							<label class="block sm:col-span-2">
								<span class="mb-2 block text-sm font-bold text-slate-600">Status Verifikasi</span>
								<select class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand disabled:text-slate-400" bind:value={form.status_verified} disabled={form.roles === 'super-admin'}>
									<option value="verified">verified</option>
									{#if form.roles !== 'super-admin'}
										<option value="not-verified">not-verified</option>
									{/if}
								</select>
							</label>
						{/if}
					</div>

					<div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<button type="button" class="rounded-2xl bg-slate-100 px-5 py-4 font-bold" onclick={closeForm}>Batal</button>
						<button class="rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white disabled:bg-slate-300" disabled={isSaving}>
							{isSaving ? 'Menyimpan...' : 'Simpan User'}
						</button>
					</div>
				</form>
		</div>
	{/if}

	{#if toast}
		<div class="fixed bottom-6 right-6 z-50 rounded-2xl bg-forest px-5 py-4 font-semibold text-white shadow-soft">{toast}</div>
	{/if}
{/if}
