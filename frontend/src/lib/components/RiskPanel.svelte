<script>
	import EmptyState from './EmptyState.svelte';
	import Icon from './Icon.svelte';

	let { risks = [] } = $props();
</script>

<section class="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
	<div class="mb-6 flex items-center gap-4">
		<span class="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700"><Icon name="alert" /></span>
		<h2 class="text-2xl font-semibold">Analisis Risiko</h2>
	</div>
	{#if risks.length === 0}
		<EmptyState title="Belum ada risiko AI" message="Risiko akan tampil setelah endpoint AI mengembalikan prediksi." />
	{:else}
		<div class="space-y-4">
			{#each risks as risk}
				<article class="rounded-2xl border border-slate-100 bg-slate-50 p-5">
					<div class="flex items-start justify-between gap-4">
						<h3 class="font-bold">{risk[0]}</h3>
						<span class={`rounded-full px-3 py-1 text-xs font-bold ${risk[3] === 'Tinggi' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{risk[3]}</span>
					</div>
					<p class="mt-3 text-sm text-slate-600">{risk[1]}</p>
					<p class="mt-3 text-sm font-semibold text-emerald-700">{risk[2]}</p>
				</article>
			{/each}
		</div>
	{/if}
</section>
