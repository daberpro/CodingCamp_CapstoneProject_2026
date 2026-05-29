<script>
	import { onMount } from 'svelte';
	import {
		createMaterial,
		createPurchase,
		createProduct,
		createSalesTransaction,
		deleteMaterial,
		deletePurchase,
		deleteProduct,
		deleteSale,
		getCurrentUser,
		loadPitakadoData,
		updateMaterial,
		updatePurchase,
		updateProduct,
		updateSale
	} from '$lib/api.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import SkeletonScreen from '$lib/components/SkeletonScreen.svelte';
	import TablePagination from '$lib/components/TablePagination.svelte';
	import { money } from '$lib/utils/format.js';

	const resources = {
		products: {
			label: 'Products',
			title: 'Produk',
			idKey: 'id',
			deleteRole: 'admin',
			fields: [
				['nama_produk', 'Nama Produk', 'text', true],
				['harga_jual', 'Harga Jual', 'number', true]
			],
			columns: [
				['id', 'ID'],
				['nama_produk', 'Nama Produk'],
				['harga_jual', 'Harga Jual']
			]
		},
		materials: {
			label: 'Materials',
			title: 'Material',
			idKey: 'material_id',
			deleteRole: 'super-admin',
			fields: [
				['material_id', 'Material ID', 'text', true],
				['nama_barang', 'Nama Barang', 'text', true],
				['unit_type', 'Unit Type', 'text', true],
				['usage_per_bouquet', 'Usage per Bouquet', 'number', true],
				['lead_time', 'Lead Time', 'number', true],
				['wastage_rate', 'Wastage Rate', 'number', true]
			],
			columns: [
				['material_id', 'ID'],
				['nama_barang', 'Nama Barang'],
				['unit_type', 'Unit'],
				['current_stock', 'Stok'],
				['usage_per_bouquet', 'Usage'],
				['lead_time', 'Lead'],
				['wastage_rate', 'Wastage']
			]
		},
		purchases: {
			label: 'Pembelian Material',
			title: 'Pembelian',
			idKey: 'id',
			deleteRole: 'super-admin',
			fields: [
				['tanggal', 'Tanggal', 'date', true],
				['material_id', 'Material ID', 'text', true],
				['qty', 'Qty', 'number', true],
				['harga_satuan', 'Harga Satuan', 'number', true]
			],
			columns: [
				['id', 'ID'],
				['tanggal', 'Tanggal'],
				['material_id', 'Material'],
				['qty', 'Qty'],
				['harga_satuan', 'Harga Satuan'],
				['total_harga', 'Total']
			]
		},
		sales: {
			label: 'Sales',
			title: 'Sales',
			idKey: 'id',
			deleteRole: 'super-admin',
			fields: [
				['tanggal', 'Tanggal', 'date', true],
				['produk', 'Produk', 'text', true],
				['qty', 'Qty', 'number', true],
				['harga_jual', 'Harga Jual', 'number', true],
				['modal', 'Modal', 'number', true],
				['profit', 'Profit', 'number', true],
				['is_event', 'Event', 'checkbox', false],
				['event_type', 'Event Type', 'text', false]
			],
			columns: [
				['id', 'ID'],
				['tanggal', 'Tanggal'],
				['produk', 'Produk'],
				['qty', 'Qty'],
				['harga_jual', 'Harga Jual'],
				['modal', 'Modal'],
				['profit', 'Profit'],
				['is_event', 'Event'],
				['event_type', 'Tipe Event']
			]
		}
	};

	let active = $state('products');
	let currentUser = $state(null);
	let apiData = $state(null);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state('');
	let toast = $state('');
	let search = $state('');
	let formOpen = $state(false);
	let formMode = $state('create');
	let form = $state({});
	let page = $state(1);
	let pageSize = $state(10);

	let resource = $derived(resources[active]);
	let isSuperAdmin = $derived(currentUser?.roles === 'super-admin');
	let rows = $derived(getRows(active, apiData));
	let filteredRows = $derived(
		rows.filter((row) =>
			resource.columns
				.map(([key]) => formatCell(row, key))
				.join(' ')
				.toLowerCase()
				.includes(search.trim().toLowerCase())
		)
	);
	let paginatedRows = $derived(filteredRows.slice((page - 1) * pageSize, page * pageSize));

	$effect(() => {
		active;
		search;
		page = 1;
	});

	onMount(loadAdminData);

	async function loadAdminData() {
		isLoading = true;
		error = '';

		try {
			const user = await getCurrentUser();
			if (!['admin', 'super-admin'].includes(user?.roles)) {
				throw new Error('Akses ditolak. Halaman ini hanya untuk admin.');
			}
			const data = await loadPitakadoData();
			currentUser = user;
			apiData = data;
		} catch (loadError) {
			error = loadError.message || 'Gagal memuat data admin.';
		} finally {
			isLoading = false;
		}
	}

	function getRows(key, data) {
		if (!data) return [];
		if (key === 'products') return data.products || [];
		if (key === 'materials') return data.materials || [];
		if (key === 'purchases') return data.purchases || [];
		return data.sales || [];
	}

	function emptyForm() {
		const next = {};
		for (const [key, , type] of resource.fields) {
			next[key] = type === 'checkbox' ? false : '';
		}
		if (active === 'sales') {
			next.tanggal = new Date().toISOString().slice(0, 10);
			next.is_event = false;
		}
		if (active === 'purchases') next.tanggal = new Date().toISOString().slice(0, 10);
		return next;
	}

	function openCreateForm() {
		formMode = 'create';
		form = emptyForm();
		formOpen = true;
	}

	function openEditForm(row) {
		formMode = 'edit';
		form = {};
		for (const [key, , type] of resource.fields) {
			if (type === 'date') {
				form[key] = String(row[key] || '').slice(0, 10);
			} else if (type === 'checkbox') {
				form[key] = Boolean(row[key]);
			} else {
				form[key] = row[key] ?? '';
			}
		}
		form[resource.idKey] = row[resource.idKey];
		formOpen = true;
	}

	function closeForm() {
		formOpen = false;
		form = {};
	}

	function setField(key, value, type) {
		form = {
			...form,
			[key]: type === 'number' ? Number(value || 0) : value
		};
	}

	function payloadFromForm() {
		const payload = {};
		for (const [key, , type] of resource.fields) {
			if (type === 'number') payload[key] = Number(form[key] || 0);
			else if (type === 'checkbox') payload[key] = Boolean(form[key]);
			else payload[key] = form[key] || null;
		}
		return payload;
	}

	async function submitForm(event) {
		event.preventDefault();
		isSaving = true;
		error = '';

		try {
			const payload = payloadFromForm();
			const id = form[resource.idKey];

			if (active === 'products') {
				if (formMode === 'edit') await updateProduct(id, payload);
				else await createProduct(payload);
			}

			if (active === 'materials') {
				if (formMode === 'edit') await updateMaterial(id, payload);
				else await createMaterial(payload);
			}

			if (active === 'purchases') {
				if (formMode === 'edit') await updatePurchase(id, payload);
				else await createPurchase(payload);
			}

			if (active === 'sales') {
				if (formMode === 'edit') await updateSale(id, payload);
				else await createSalesTransaction(payload);
			}

			toast = `${resource.title} berhasil disimpan.`;
			closeForm();
			await loadAdminData();
		} catch (saveError) {
			error = saveError.message || `Gagal menyimpan ${resource.title.toLowerCase()}.`;
		} finally {
			isSaving = false;
		}
	}

	async function removeRow(row) {
		if (!isSuperAdmin) return;
		const id = row[resource.idKey];
		if (!window.confirm(`Hapus ${resource.title} ${id}?`)) return;

		error = '';
		try {
			if (active === 'products') await deleteProduct(id);
			if (active === 'materials') await deleteMaterial(id);
			if (active === 'purchases') await deletePurchase(id);
			if (active === 'sales') await deleteSale(id);
			toast = `${resource.title} berhasil dihapus.`;
			await loadAdminData();
		} catch (deleteError) {
			error = deleteError.message || `Gagal menghapus ${resource.title.toLowerCase()}.`;
		}
	}

	function switchResource(key) {
		active = key;
		search = '';
		closeForm();
	}

	function formatCell(row, key) {
		const value = row[key] ?? (key === 'total_harga' ? row.total : undefined);
		if (['harga_satuan', 'total_harga', 'harga_jual', 'modal', 'profit'].includes(key)) return money(value);
		if (key === 'is_event') return value ? 'Ya' : 'Tidak';
		if (key === 'tanggal') return String(value || '').slice(0, 10);
		return value ?? '-';
	}
</script>

{#if isLoading}
	<SkeletonScreen />
{:else}
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
			<PageTitle title="Manajemen Data" subtitle="Kelola material, pembelian material, dan transaksi sales" icon="settings" />
			<button class="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white" onclick={openCreateForm}>
				<Icon name="plus" size={18} /> Tambah {resource.title}
			</button>
		</div>

		{#if error}
			<div class="rounded-2xl bg-red-50 px-5 py-4 font-semibold text-red-700">{error}</div>
		{/if}

		<section class="rounded-3xl bg-white p-4 shadow-sm">
			<div class="flex flex-wrap gap-3">
				{#each Object.entries(resources) as [key, item]}
					<button
						class={`rounded-2xl px-5 py-3 font-bold ${active === key ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}
						onclick={() => switchResource(key)}
					>
						{item.label}
					</button>
				{/each}
			</div>
		</section>

		<section class="rounded-3xl bg-white p-5 shadow-sm">
			<label class="flex items-center gap-3 rounded-2xl bg-slate-100 px-5 py-4 text-slate-400">
				<Icon name="search" size={20} />
				<input class="w-full bg-transparent text-slate-700 outline-none" bind:value={search} placeholder={`Cari ${resource.label.toLowerCase()}...`} />
			</label>
		</section>

		<section class="rounded-3xl bg-white shadow-sm">
			{#if filteredRows.length === 0}
				<div class="p-6">
					<EmptyState title="Data kosong" message={`Belum ada data ${resource.label.toLowerCase()} dari endpoint.`} />
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full text-left">
						<thead class="text-sm uppercase tracking-wide text-slate-400">
							<tr>
								{#each resource.columns as [, label]}
									<th class="px-6 py-4">{label}</th>
								{/each}
								<th class="px-6 py-4 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each paginatedRows as row}
								<tr>
									{#each resource.columns as [key]}
										<td class="whitespace-nowrap px-6 py-5">{formatCell(row, key)}</td>
									{/each}
									<td class="px-6 py-5">
										<div class="flex justify-end gap-2">
											<button class="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700" title="Edit" onclick={() => openEditForm(row)}>
												<Icon name="edit" size={18} />
											</button>
											{#if resource.deleteRole === 'admin' || isSuperAdmin}
												<button class="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700" title="Hapus" onclick={() => removeRow(row)}>
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
				<TablePagination total={filteredRows.length} bind:page bind:pageSize />
			{/if}
		</section>
	</div>

	{#if formOpen}
		<div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
			<form class="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-soft sm:p-8" onsubmit={submitForm}>
				<div class="mb-6 flex items-center justify-between gap-4">
					<div>
						<h2 class="text-2xl font-bold">{formMode === 'edit' ? 'Edit' : 'Tambah'} {resource.title}</h2>
						<p class="text-slate-500">Setiap perubahan dikirim ke endpoint backend dengan CSRF token.</p>
					</div>
					<button type="button" class="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" onclick={closeForm}>
						<Icon name="x" size={18} />
					</button>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					{#each resource.fields as [key, label, type, required]}
						<label class={`block ${type === 'checkbox' ? 'sm:col-span-2' : ''}`}>
							<span class="mb-2 block text-sm font-bold text-slate-600">{label}</span>
							{#if type === 'checkbox'}
								<button
									type="button"
									class={`inline-flex items-center gap-3 rounded-2xl px-5 py-4 font-bold ${form[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
									onclick={() => (form = { ...form, [key]: !form[key] })}
								>
									<Icon name={form[key] ? 'check' : 'x'} size={18} />
									{form[key] ? 'Ya' : 'Tidak'}
								</button>
							{:else}
								<input
									class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand"
									type={type}
									value={form[key] ?? ''}
									required={required}
									disabled={formMode === 'edit' && active === 'materials' && key === 'material_id'}
									oninput={(event) => setField(key, event.currentTarget.value, type)}
								/>
							{/if}
						</label>
					{/each}
				</div>

				<div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<button type="button" class="rounded-2xl bg-slate-100 px-5 py-4 font-bold" onclick={closeForm}>Batal</button>
					<button class="rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white disabled:bg-slate-300" disabled={isSaving}>
						{isSaving ? 'Menyimpan...' : 'Simpan'}
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if toast}
		<div class="fixed bottom-6 right-6 z-50 rounded-2xl bg-forest px-5 py-4 font-semibold text-white shadow-soft">{toast}</div>
	{/if}
{/if}
