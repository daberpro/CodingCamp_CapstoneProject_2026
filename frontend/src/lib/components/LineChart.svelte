<script>
	import { compactMoney } from '$lib/utils/format.js';

	let { title, subtitle, data = [], unit = 'money' } = $props();

	let maxValue = $derived(Math.max(...data.flatMap((item) => [Number(item.actual || 0), Number(item.forecast || 0)]), 1));
	let hasData = $derived(data.some((item) => item.actual || item.forecast));
	let labelStep = $derived(Math.max(1, Math.ceil(data.length / 8)));

	function chartPath(key) {
		const values = data.map((item) => Number(item[key] || 0));
		const step = data.length > 1 ? 820 / (data.length - 1) : 0;
		return values
			.map((value, index) => {
				const x = 40 + index * step;
				const y = 230 - (value / maxValue) * 190;
				return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(' ');
	}

	function label(value) {
		return unit === 'money' ? compactMoney(value) : `${Math.round(value)} unit`;
	}
</script>

<section class="my-10 rounded-3xl bg-white p-6 shadow-soft sm:p-8">
	<div class="mb-6 flex flex-col justify-between gap-4 md:flex-row">
		<div>
			<h2 class="text-2xl font-semibold">{title}</h2>
			<p class="text-lg text-slate-700">{subtitle}</p>
		</div>
		<div class="flex gap-6">
			<span class="flex items-center gap-2"><i class="h-4 w-4 rounded-full bg-emerald-700"></i>Aktual</span>
			<span class="flex items-center gap-2"><i class="h-4 w-4 rounded-full bg-orange-700"></i>Prediksi AI</span>
		</div>
	</div>
	<div class="relative h-72 overflow-hidden">
		{#if !hasData}
			<div class="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500">
				Belum ada data grafik dari endpoint.
			</div>
		{:else}
			<div class="absolute inset-0 grid grid-rows-4">
				{#each [1, 0.75, 0.5, 0.25] as ratio}
					<div class="border-t border-dashed border-slate-200 text-sm text-slate-400">{label(maxValue * ratio)}</div>
				{/each}
			</div>
			<svg class="absolute inset-0 h-full w-full" viewBox="0 0 900 260" preserveAspectRatio="none">
				<path d={chartPath('actual')} fill="none" stroke="#047857" stroke-width="4" />
				<path d={chartPath('forecast')} fill="none" stroke="#ad3f25" stroke-width="3" stroke-dasharray="8 6" />
			</svg>
			<div class="absolute bottom-0 left-0 right-0 grid text-xs font-bold text-slate-600" style={`grid-template-columns: repeat(${data.length}, minmax(0, 1fr))`}>
				{#each data as item, index}<span class="truncate text-center">{index % labelStep === 0 || index === data.length - 1 ? item.label.toUpperCase() : ''}</span>{/each}
			</div>
		{/if}
	</div>
</section>
