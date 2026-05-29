<script>
	import Icon from './Icon.svelte';
	let { title, subtitle, icon = '' } = $props();
</script>

<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
	<div class="flex items-center gap-5">
		{#if icon}
			<div class="grid h-16 w-16 place-items-center rounded-[22px] bg-brand text-forest">
				<Icon name={icon} size={30} />
			</div>
		{/if}
		<div>
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
			<p class="mt-1 text-lg text-slate-700">{subtitle}</p>
		</div>
	</div>
</div>
