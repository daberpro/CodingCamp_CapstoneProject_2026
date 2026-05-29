<script>
	import { money } from '$lib/utils/format.js';
	import Icon from './Icon.svelte';

	let {
		cart = [],
		customerName = '',
		paymentMethod = 'Tunai',
		isPaying = false,
		onCustomerChange = () => {},
		onPaymentChange = () => {},
		onQtyChange = () => {},
		onClear = () => {},
		onSubmit = () => {}
	} = $props();

	let subtotal = $derived(cart.reduce((sum, item) => sum + item.price * item.qty, 0));
	let tax = $derived(subtotal * 0.1);
	let total = $derived(subtotal + tax);
</script>

<aside class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-28">
	<h2 class="mb-5 flex items-center gap-3 text-2xl font-semibold"><Icon name="cart" />Keranjang ({cart.length})</h2>
	<input
		class="mb-6 w-full rounded-2xl bg-slate-100 px-5 py-4 outline-none"
		placeholder="Nama pelanggan (opsional)"
		value={customerName}
		oninput={(event) => onCustomerChange(event.currentTarget.value)}
	/>

	<div class="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
		{#each cart as item}
			<article class="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-slate-50 p-4">
				<span class="text-2xl">{item.icon}</span>
				<div class="min-w-0">
					<h3 class="truncate font-bold">{item.name}</h3>
					<p class="text-sm text-emerald-700">{money(item.price)}</p>
				</div>
				<div class="flex items-center gap-3">
					<button class="grid h-9 w-9 place-items-center rounded-full bg-slate-200" onclick={() => onQtyChange(item.id, -1)}>-</button>
					<span class="w-5 text-center font-bold">{item.qty}</span>
					<button class="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700" onclick={() => onQtyChange(item.id, 1)}>+</button>
				</div>
			</article>
		{/each}
	</div>

	<div class="mt-6 border-t border-slate-200 pt-5">
		<div class="flex justify-between py-1"><span>Subtotal</span><span>{money(subtotal)}</span></div>
		<div class="flex justify-between py-1"><span>Pajak (10%)</span><span>{money(tax)}</span></div>
		<div class="mt-4 flex justify-between border-t border-slate-200 pt-4 text-xl font-bold">
			<span>Total</span><span class="text-emerald-700">{money(total)}</span>
		</div>

		<p class="mt-5 font-semibold">Metode Pembayaran</p>
		<div class="mt-3 grid grid-cols-2 gap-3">
			{#each ['Tunai', 'Kartu/QRIS'] as method}
				<button
					class={`rounded-2xl px-4 py-4 font-bold ${paymentMethod === method ? 'bg-emerald-700 text-white' : 'bg-slate-100'}`}
					onclick={() => onPaymentChange(method)}
				>
					{method}
				</button>
			{/each}
		</div>
		<button
			class="mt-5 w-full rounded-2xl bg-emerald-700 px-4 py-5 font-bold text-white disabled:bg-slate-200 disabled:text-slate-400"
			disabled={!cart.length || isPaying}
			onclick={onSubmit}
		>
			{isPaying ? 'Memproses...' : 'Bayar Sekarang'}
		</button>
		<button class="mt-5 w-full text-center font-medium text-red-600 disabled:text-slate-300" disabled={!cart.length} onclick={onClear}>
			Kosongkan Keranjang
		</button>
	</div>
</aside>
