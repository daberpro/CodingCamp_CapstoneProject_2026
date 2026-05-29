<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/dashboard', { replaceState: true });
	});
</script>

<div class="grid min-h-screen place-items-center bg-[#f4f7f6] text-slate-500">
	Memuat Pitakado...
</div>
