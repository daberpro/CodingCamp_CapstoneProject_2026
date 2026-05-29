<script>
	import Icon from './Icon.svelte';
	let { icon, label, value, suffix = '', tone = 'neutral', badge = '' } = $props();
</script>

<div class={`rounded-3xl border p-8 shadow-soft ${tone === 'warm' ? 'border-orange-100 bg-gradient-to-br from-emerald-50 to-orange-50' : 'border-slate-100 bg-white'}`}>
	<div class="mb-5 flex items-center justify-between">
		<div class={`grid h-14 w-14 place-items-center rounded-2xl ${tone === 'green' ? 'bg-emerald-100 text-emerald-700' : tone === 'warm' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'}`}>
			<Icon name={icon} />
		</div>
		{#if badge}<span class="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">{badge}</span>{/if}
	</div>
	<p class="text-slate-600">{label}</p>
	<div class="mt-2 flex items-end gap-2">
		<strong class={`text-3xl ${tone === 'warm' ? 'text-orange-700' : 'text-emerald-700'}`}>{value}</strong>
		{#if suffix}<span class="pb-1 text-slate-600">{suffix}</span>{/if}
	</div>
</div>
