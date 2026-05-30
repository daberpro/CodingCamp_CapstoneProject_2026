<script>
	import { onMount } from 'svelte';
	import { explainAIInsights, loadAIInsights, loadPitakadoData } from '$lib/api.js';
	import GeminiPanel from '$lib/components/GeminiPanel.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import LineChart from '$lib/components/LineChart.svelte';
	import ModelCards from '$lib/components/ModelCards.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import RecommendationPanel from '$lib/components/RecommendationPanel.svelte';
	import RiskPanel from '$lib/components/RiskPanel.svelte';
	import SkeletonScreen from '$lib/components/SkeletonScreen.svelte';
	import {
		buildAIModelCards,
		buildAIRecommendations,
		buildAIRisks,
		buildAIStats,
		buildWeeklySeries,
		mapProducts,
		mapPurchases,
		mapTransactions
	} from '$lib/utils/data.js';

	let isLoading = $state(true);
	let isRefreshing = $state(false);
	let isExplaining = $state(false);
	let apiData = $state(null);
	let aiData = $state(null);
	let aiExplanation = $state(null);
	let error = $state('');
	let explainError = $state('');
	let forecastHorizonDays = $state(7);
	let confidenceInterval = $state(0.95);

	let products = $derived(mapProducts(apiData?.materials));
	let transactions = $derived(mapTransactions(apiData?.sales));
	let purchases = $derived(mapPurchases(apiData?.purchases));
	let predictions = $derived(aiData?.prediction?.predictions || []);
	let materials = $derived(aiData?.prediction?.material_requirements || []);
	let modelCards = $derived(buildAIModelCards(aiData?.modelInfo));
	let risks = $derived(buildAIRisks(predictions));
	let recommendations = $derived(buildAIRecommendations(predictions));
	let stats = $derived(buildAIStats(predictions, materials, aiData?.modelInfo));
	let forecastTitle = $derived(`Prediksi Revenue ${forecastHorizonDays} Hari`);
	let forecastChart = $derived(
		buildWeeklySeries(transactions, purchases, predictions, products, forecastHorizonDays).map((item) => ({
			label: item.day,
			actual: item.revenue,
			forecast: item.forecast
		}))
	);

	onMount(refreshAI);

	async function refreshAI() {
		isRefreshing = true;
		error = '';
		explainError = '';

		try {
			apiData = await loadPitakadoData();
			const mappedProducts = mapProducts(apiData.materials || []);
			aiData = await loadAIInsights(mappedProducts, apiData.sales || [], {
				forecast_horizon_days: forecastHorizonDays,
				confidence_interval: confidenceInterval
			});
			await loadExplanation();
		} catch (loadError) {
			error = loadError.message || 'Gagal memuat endpoint AI.';
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	async function loadExplanation() {
		if (!aiData?.prediction?.predictions?.length) return;
		isExplaining = true;
		try {
			aiExplanation = await explainAIInsights(aiData.prediction, 'id');
		} catch (loadError) {
			explainError = loadError.message || 'Endpoint explain belum tersedia.';
		} finally {
			isExplaining = false;
		}
	}
</script>

{#if isLoading}
	<SkeletonScreen />
{:else}
	<div class="flex flex-col gap-8">
			<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<PageTitle title="AI Prediksi" subtitle="Forecasting cerdas berbasis endpoint AI" icon="brain" />
				<button class="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold shadow-sm disabled:text-slate-400" onclick={refreshAI} disabled={isRefreshing}>
					<Icon name="refresh" size={18} /> {isRefreshing ? 'Memuat...' : 'Perbarui Prediksi'}
				</button>
			</div>

			<section class="rounded-3xl bg-white p-5 shadow-sm">
				<div class="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
					<label class="block">
						<span class="mb-2 block text-sm font-bold text-slate-600">Forecast Horizon</span>
						<select class="w-full rounded-2xl bg-slate-100 px-5 py-4 font-semibold outline-none focus:ring-2 focus:ring-brand" bind:value={forecastHorizonDays}>
							{#each [3, 7, 14, 30] as days}
								<option value={days}>{days} hari</option>
							{/each}
						</select>
					</label>
					<label class="block">
						<span class="mb-2 block text-sm font-bold text-slate-600">Confidence Interval</span>
						<select class="w-full rounded-2xl bg-slate-100 px-5 py-4 font-semibold outline-none focus:ring-2 focus:ring-brand" bind:value={confidenceInterval}>
							{#each [0.8, 0.9, 0.95, 0.99] as interval}
								<option value={interval}>{Math.round(interval * 100)}%</option>
							{/each}
						</select>
					</label>
					<button class="inline-flex h-[4.25rem] items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 font-bold text-white disabled:bg-slate-300" onclick={refreshAI} disabled={isRefreshing}>
						<Icon name="refresh" size={18} /> Terapkan
					</button>
				</div>
				<p class="mt-3 text-sm text-slate-500">Horizon di atas 7 hari diproses otomatis per batch 7 hari.</p>
			</section>

			{#if error}
				<div class="rounded-3xl bg-orange-50 p-5 font-semibold text-orange-700">{error}</div>
			{/if}

			{#if modelCards.length}
				<ModelCards cards={modelCards} />
			{/if}

			<LineChart title={forecastTitle} subtitle={`Horizon ${forecastHorizonDays} hari dengan confidence ${Math.round(confidenceInterval * 100)}%`} data={forecastChart} />

			<div class="grid gap-5 rounded-3xl bg-emerald-50 p-6 sm:grid-cols-2 xl:grid-cols-4">
				{#each stats as stat}
					<div>
						<p class="text-sm text-slate-600">{stat[0]}</p>
						<p class="mt-1 text-2xl font-extrabold text-emerald-700">{stat[1]}</p>
					</div>
				{/each}
			</div>

			<GeminiPanel explanation={aiExplanation} isLoading={isExplaining} error={explainError} />

			<div class="grid gap-8 xl:grid-cols-2">
				<RiskPanel {risks} />
				<RecommendationPanel {recommendations} />
			</div>
	</div>
{/if}
