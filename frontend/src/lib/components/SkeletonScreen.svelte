<script>
	import TopLoadingBar from './TopLoadingBar.svelte';

	let { showBar = true } = $props();
</script>

{#if showBar}
	<TopLoadingBar />
{/if}

<div class="animate-pulse space-y-8">
	<div class="space-y-3">
		<div class="h-10 w-72 max-w-full rounded-2xl bg-slate-200"></div>
		<div class="h-5 w-96 max-w-full rounded-xl bg-slate-200/80"></div>
	</div>
	<div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
		<div class="h-36 rounded-3xl bg-white shadow-sm"></div>
		<div class="h-36 rounded-3xl bg-white shadow-sm"></div>
		<div class="h-36 rounded-3xl bg-white shadow-sm"></div>
		<div class="h-36 rounded-3xl bg-white shadow-sm"></div>
	</div>
	<div class="h-80 rounded-3xl bg-white shadow-sm"></div>
	<div class="grid gap-6 xl:grid-cols-2">
		<div class="h-64 rounded-3xl bg-white shadow-sm"></div>
		<div class="h-64 rounded-3xl bg-white shadow-sm"></div>
	</div>
</div>
