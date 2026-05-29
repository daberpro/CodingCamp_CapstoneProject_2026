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
		buildWeeklySeries,
		getDashboardMetrics,
		mapProducts,
		mapPurchases,
		mapTransactions
	} from '$lib/utils/data.js';

	let isLoading = $state(true);
	let error = $state('');
	let apiData = $state(null);
	let aiData = $state(null);
	let dashboardRange = $state('7 Hari Terakhir');

	let products = $derived(mapProducts(apiData?.materials));
	let transactions = $derived(mapTransactions(apiData?.sales));
	let purchases = $derived(mapPurchases(apiData?.purchases));
	let predictions = $derived(aiData?.prediction?.predictions || []);
	let metrics = $derived(getDashboardMetrics(transactions, products, predictions, dashboardRange));
	let chartData = $derived(
		buildWeeklySeries(transactions, purchases, predictions, products).map((item) => ({
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
</script>

{#if isLoading}
	<SkeletonScreen />
{:else}
	<div class="flex flex-col gap-6">
			<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<PageTitle title="CEO Dashboard" subtitle="Ringkasan performa bisnis hari ini" />
				<div class="flex flex-wrap gap-3">
					<select class="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold" bind:value={dashboardRange}>
						<option>Hari Ini</option>
						<option>7 Hari Terakhir</option>
						<option>30 Hari Terakhir</option>
					</select>
					<a class="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white" href="/laporan">
						<Icon name="download" size={18} /> Export PDF
					</a>
				</div>
			</div>

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
