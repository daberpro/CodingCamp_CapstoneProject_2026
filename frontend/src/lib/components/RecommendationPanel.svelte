<script>
	import EmptyState from './EmptyState.svelte';
	import Icon from './Icon.svelte';

	let { recommendations = [] } = $props();
</script>

<section class="rounded-3xl bg-forest p-6 text-white shadow-sm sm:p-8">
	<div class="mb-8 flex items-center gap-4">
		<span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-forest"><Icon name="bolt" /></span>
		<h2 class="text-2xl font-semibold">Rekomendasi AI</h2>
	</div>
	{#if recommendations.length === 0}
		<div class="rounded-2xl bg-white/10 p-5 text-emerald-50">
			Belum ada rekomendasi dari endpoint AI.
		</div>
	{:else}
		<div class="space-y-4">
			{#each recommendations as item}
				<article class="rounded-2xl bg-white/10 p-5">
					<div class="flex items-start justify-between gap-4">
						<h3 class="font-bold">{item[0]}</h3>
						<span class="text-xs font-bold text-brand">{item[2]}</span>
					</div>
					<p class="mt-3 text-sm text-emerald-50/80">{item[1]}</p>
				</article>
			{/each}
		</div>
	{/if}
</section>
