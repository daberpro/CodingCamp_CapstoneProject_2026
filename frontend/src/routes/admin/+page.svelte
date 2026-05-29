<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/admin/data', { replaceState: true });
	});
</script>

<div class="grid min-h-80 place-items-center text-slate-500">
	Memuat menu admin...
</div>
