<script>
	let { series = [] } = $props();
	let maxBar = $derived(Math.max(...series.flatMap((item) => [item.revenue, item.expense]), 1));
	let hasData = $derived(series.some((item) => item.revenue || item.expense));
</script>

<section class="my-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
	<div class="mb-6 flex justify-between">
		<div>
			<h2 class="text-2xl font-semibold">Pendapatan vs Pengeluaran</h2>
			<p class="text-lg text-slate-700">Perbandingan mingguan</p>
		</div>
		<div class="hidden gap-6 sm:flex">
			<span class="flex items-center gap-2"><i class="h-4 w-4 rounded-full bg-emerald-700"></i>Pendapatan</span>
			<span class="flex items-center gap-2"><i class="h-4 w-4 rounded-full bg-orange-300"></i>Pengeluaran</span>
		</div>
	</div>
	{#if !hasData}
		<div class="grid h-72 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500">
			Belum ada data pendapatan atau pembelian dari endpoint.
		</div>
	{:else}
		<div class="flex h-72 items-end gap-5 border-b border-dashed border-slate-200 px-2 sm:gap-10">
			{#each series as item}
				<div class="flex flex-1 flex-col items-center justify-end gap-2">
					<div class="flex h-56 items-end gap-1 sm:gap-2">
						<div class="w-8 rounded-t-lg bg-emerald-700 sm:w-16" style={`height: ${Math.max(4, (item.revenue / maxBar) * 220)}px`}></div>
						<div class="w-8 rounded-t-lg bg-orange-300 sm:w-16" style={`height: ${Math.max(4, (item.expense / maxBar) * 220)}px`}></div>
					</div>
					<span class="text-sm">{item.day}</span>
				</div>
			{/each}
		</div>
	{/if}
</section>
