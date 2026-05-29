<script>
	import { money } from '$lib/utils/format.js';
	import EmptyState from './EmptyState.svelte';
	import TablePagination from './TablePagination.svelte';

	let { transactions = [], selectedMethod = 'Semua', onMethodChange = () => {} } = $props();

	const methods = ['Semua', 'Tunai', 'QRIS', 'Kartu'];
	let page = $state(1);
	let pageSize = $state(10);
	let paginatedTransactions = $derived(transactions.slice((page - 1) * pageSize, page * pageSize));

	$effect(() => {
		selectedMethod;
		transactions.length;
		page = 1;
	});
</script>

<section class="rounded-3xl bg-white shadow-sm">
	<div class="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
		<h2 class="text-2xl font-semibold">Riwayat Transaksi</h2>
		<div class="flex flex-wrap gap-2">
			{#each methods as method}
				<button
					class={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedMethod === method ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
					onclick={() => onMethodChange(method)}
				>
					{method}
				</button>
			{/each}
		</div>
	</div>

	{#if transactions.length === 0}
		<div class="p-6">
			<EmptyState title="Belum ada transaksi" message="Data transaksi akan muncul setelah endpoint backend mengembalikan penjualan." />
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full text-left">
				<thead class="text-sm uppercase tracking-wide text-slate-400">
					<tr>
						<th class="px-6 py-4">ID Transaksi</th>
						<th class="px-6 py-4">Waktu</th>
						<th class="px-6 py-4">Kasir</th>
						<th class="px-6 py-4">Items</th>
						<th class="px-6 py-4">Total</th>
						<th class="px-6 py-4">Metode</th>
						<th class="px-6 py-4">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each paginatedTransactions as item}
						<tr class="text-slate-800">
							<td class="px-6 py-5 font-bold text-emerald-700">{item.id}</td>
							<td class="px-6 py-5">{item.time}</td>
							<td class="px-6 py-5">{item.cashier}</td>
							<td class="px-6 py-5">{item.items}</td>
							<td class="px-6 py-5 font-bold">{money(item.total)}</td>
							<td class="px-6 py-5">
								<span class="rounded-full bg-slate-100 px-3 py-1 text-xs">{item.method}</span>
							</td>
							<td class="px-6 py-5">
								<span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{item.status}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<TablePagination total={transactions.length} bind:page bind:pageSize />
	{/if}
</section>
