<script>
	let { cards = [] } = $props();
</script>

<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
	{#each cards as card}
		<article class="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between">
				<span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{card[3]}</span>
				<span class="text-slate-400">›</span>
			</div>
			<h3 class="font-bold">{card[0]}</h3>
			<div class="mt-3 h-2 rounded-full bg-slate-100">
				<div class="h-2 rounded-full bg-brand" style={`width: ${card[1]}`}></div>
			</div>
			<p class="mt-4 text-sm text-slate-500">{card[2]}</p>
		</article>
	{/each}
</div>
