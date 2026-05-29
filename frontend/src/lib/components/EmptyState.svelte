<script>
	let { title = '', message } = $props();
</script>

<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
	{#if title}
		<h3 class="mb-2 text-lg font-bold text-slate-700">{title}</h3>
	{/if}
	{message}
</div>
