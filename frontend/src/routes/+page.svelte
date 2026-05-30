<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getCurrentUser } from '$lib/api.js';

	onMount(async () => {
		try {
			const user = await getCurrentUser();
			await goto(user?.roles === 'kasir' ? '/kasir' : '/dashboard', { replaceState: true });
		} catch {
			await goto('/login', { replaceState: true });
		}
	});
</script>

<div class="grid min-h-screen place-items-center bg-[#f4f7f6] text-slate-500">
	Memuat Pitakado...
</div>
