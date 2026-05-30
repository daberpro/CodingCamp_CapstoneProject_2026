<script>
	import { onMount } from 'svelte';
	import { loadAIInsights, loadPitakadoData } from '$lib/api.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import LineChart from '$lib/components/LineChart.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import SkeletonScreen from '$lib/components/SkeletonScreen.svelte';
	import {
		buildRangeSeries,
		defaultDateRange,
		getDashboardMetricsByRange,
		mapProducts,
		mapPurchases,
		mapTransactions,
		presetDateRange
	} from '$lib/utils/data.js';

	let isLoading = $state(true);
	let error = $state('');
	let apiData = $state(null);
	let aiData = $state(null);
	let dashboardRange = $state('7 Hari Terakhir');
	let dateRange = $state(defaultDateRange(7));

	let products = $derived(mapProducts(apiData?.materials));
	let transactions = $derived(mapTransactions(apiData?.sales));
	let purchases = $derived(mapPurchases(apiData?.purchases));
	let predictions = $derived(aiData?.prediction?.predictions || []);
	let metrics = $derived(getDashboardMetricsByRange(transactions, products, predictions, dateRange));
	let chartData = $derived(
		buildRangeSeries(transactions, purchases, dateRange, predictions, products).map((item) => ({
			label: item.day,
			actual: item.revenue,
			forecast: item.forecast
		}))
	);

	onMount(async () => {
		try {
			apiData = await loadPitakadoData();
			aiData = await loadAIInsights(products, apiData.sales || []);
			if (!apiData.hasLiveData) error = 'Backend belum mengembalikan data.';
		} catch (loadError) {
			error = loadError.message || 'Gagal memuat data dashboard.';
		} finally {
			isLoading = false;
		}
	});

	function applyPreset(item) {
		dashboardRange = item;
		dateRange = presetDateRange(item);
	}

	function setDateRangeField(key, value) {
		dashboardRange = 'Custom';
		dateRange = {
			...dateRange,
			[key]: value
		};
	}
</script>

{#if isLoading}
	<SkeletonScreen />
{:else}
	<div class="flex flex-col gap-6">
			<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<PageTitle title="CEO Dashboard" subtitle="Ringkasan performa bisnis hari ini" />
				<div class="flex flex-wrap gap-3">
					{#each ['Hari Ini', '7 Hari Terakhir', '30 Hari Terakhir'] as item}
						<button class={`rounded-2xl px-5 py-3 font-semibold ${dashboardRange === item ? 'bg-emerald-700 text-white' : 'bg-white shadow-sm'}`} onclick={() => applyPreset(item)}>
							{item}
						</button>
					{/each}
					<a class="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white" href="/laporan">
						<Icon name="download" size={18} /> Export PDF
					</a>
				</div>
			</div>

			<section class="grid gap-3 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
				<label class="block">
					<span class="mb-2 block text-sm font-bold text-slate-600">Dari Tanggal</span>
					<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" type="date" value={dateRange.startDate} onchange={(event) => setDateRangeField('startDate', event.currentTarget.value)} />
				</label>
				<label class="block">
					<span class="mb-2 block text-sm font-bold text-slate-600">Sampai Tanggal</span>
					<input class="w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none focus:ring-2 focus:ring-brand" type="date" value={dateRange.endDate} onchange={(event) => setDateRangeField('endDate', event.currentTarget.value)} />
				</label>
				<div class="rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-700">
					{dateRange.startDate} - {dateRange.endDate}
				</div>
			</section>

			{#if error}
				<EmptyState title="Data belum lengkap" message={error} />
			{/if}

			<div class="grid gap-5 lg:grid-cols-3">
				<MetricCard icon="dollar" label="Total Cash" value={metrics.cash} tone="green" badge={metrics.transactionGrowth} />
				<MetricCard icon="box" label="Total Stock Items" value={metrics.stockItems} suffix="Units" badge={metrics.stockBadge} />
				<MetricCard icon="alert" label="AI Risk Level" value={metrics.riskLevel} tone="warm" badge={metrics.riskBadge} />
			</div>

			<LineChart title="Cash Flow Trends & AI Predictions" subtitle="Real-time data merged with smart forecasting" data={chartData} />
	</div>
{/if}
