<script>
	import { onMount } from 'svelte';
	import { loadPitakadoData } from '$lib/api.js';
	import BarChart from '$lib/components/BarChart.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import SkeletonScreen from '$lib/components/SkeletonScreen.svelte';
	import TransactionTable from '$lib/components/TransactionTable.svelte';
	import {
		buildWeeklySeries,
		getReportMetrics,
		mapProducts,
		mapPurchases,
		mapTransactions
	} from '$lib/utils/data.js';

	let isLoading = $state(true);
	let apiData = $state(null);
	let period = $state('Minggu Ini');
	let selectedMethod = $state('Semua');
	let exportModalOpen = $state(false);
	let exportStatus = $state('confirm');

	let products = $derived(mapProducts(apiData?.materials));
	let transactions = $derived(mapTransactions(apiData?.sales));
	let purchases = $derived(mapPurchases(apiData?.purchases));
	let metrics = $derived(getReportMetrics(period, transactions, purchases));
	let weeklySeries = $derived(buildWeeklySeries(transactions, purchases, [], products));
	let filteredTransactions = $derived(
		selectedMethod === 'Semua' ? transactions : transactions.filter((item) => item.method === selectedMethod)
	);

	onMount(async () => {
		try {
			apiData = await loadPitakadoData();
		} finally {
			isLoading = false;
		}
	});

	function openExportModal() {
		exportStatus = 'confirm';
		exportModalOpen = true;
	}

	function closeExportModal() {
		exportModalOpen = false;
	}

	function exportCsv() {
		const header = ['id', 'waktu', 'kasir', 'items', 'total', 'metode', 'status'];
		const rows = filteredTransactions.map((item) => [
			item.id,
			item.time,
			item.cashier,
			item.items,
			item.total,
			item.method,
			item.status
		]);
		const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `laporan-${period.toLowerCase().replaceAll(' ', '-')}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		exportStatus = 'done';
	}
</script>

{#if isLoading}
	<SkeletonScreen />
{:else}
	<div class="flex flex-col gap-8">
			<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<PageTitle title="Laporan" subtitle="Analisis pendapatan dan pengeluaran" />
				<div class="flex flex-wrap gap-3">
					{#each ['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Tahun Ini'] as item}
						<button class={`rounded-2xl px-5 py-3 font-semibold ${period === item ? 'bg-emerald-700 text-white' : 'bg-white shadow-sm'}`} onclick={() => (period = item)}>
							{item}
						</button>
					{/each}
					<button class="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white" onclick={openExportModal}>
						<Icon name="download" size={18} /> Export
					</button>
				</div>
			</div>

			<div class="grid gap-5 lg:grid-cols-4">
				<MetricCard icon="dollar" label="Total Pendapatan" value={metrics.income} tone="green" />
				<MetricCard icon="alert" label="Total Pengeluaran" value={metrics.expense} tone="warm" />
				<MetricCard icon="dollar" label="Laba Bersih" value={metrics.profit} tone="green" />
				<MetricCard icon="box" label="Total Transaksi" value={metrics.count} />
			</div>

			<BarChart series={weeklySeries} />
			<TransactionTable transactions={filteredTransactions} {selectedMethod} onMethodChange={(value) => (selectedMethod = value)} />
	</div>

	{#if exportModalOpen}
		<div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
			<div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-soft sm:p-8">
				<div class="mb-6 flex items-start justify-between gap-4">
					<div>
						<h2 class="text-2xl font-bold">{exportStatus === 'done' ? 'Laporan Diunduh' : 'Download Laporan'}</h2>
						<p class="mt-2 text-slate-500">
							{exportStatus === 'done'
								? 'File CSV sudah dibuat dan dikirim ke browser.'
								: `Siapkan file CSV untuk periode ${period} dengan ${filteredTransactions.length} transaksi.`}
						</p>
					</div>
					<button class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100" onclick={closeExportModal}>
						<Icon name="x" size={18} />
					</button>
				</div>

				<div class="rounded-2xl bg-slate-50 p-4">
					<div class="flex justify-between py-1"><span class="text-slate-500">Periode</span><span class="font-bold">{period}</span></div>
					<div class="flex justify-between py-1"><span class="text-slate-500">Metode</span><span class="font-bold">{selectedMethod}</span></div>
					<div class="flex justify-between py-1"><span class="text-slate-500">Transaksi</span><span class="font-bold">{filteredTransactions.length}</span></div>
				</div>

				<div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<button class="rounded-2xl bg-slate-100 px-5 py-4 font-bold text-slate-700" onclick={closeExportModal}>
						{exportStatus === 'done' ? 'Tutup' : 'Batal'}
					</button>
					{#if exportStatus !== 'done'}
						<button class="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white" onclick={exportCsv}>
							<Icon name="download" size={18} /> Download CSV
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{/if}
