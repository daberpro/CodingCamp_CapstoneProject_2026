<script>
	import { onMount } from 'svelte';
	import { createSalesTransaction, loadPitakadoData } from '$lib/api.js';
	import CartPanel from '$lib/components/CartPanel.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import ProductGrid from '$lib/components/ProductGrid.svelte';
	import SkeletonScreen from '$lib/components/SkeletonScreen.svelte';
	import { mapSalesProducts } from '$lib/utils/data.js';
	import { matchesSearch } from '$lib/utils/format.js';

	let isLoading = $state(true);
	let isPaying = $state(false);
	let apiData = $state(null);
	let selectedCategory = $state('Semua');
	let productSearch = $state('');
	let customerName = $state('');
	let paymentMethod = $state('Tunai');
	let cart = $state([]);
	let toast = $state('');

	let products = $derived(mapSalesProducts(apiData?.products));
	let categories = $derived(['Semua', ...new Set(products.map((item) => item.category).filter(Boolean))]);
	let filteredProducts = $derived(
		(selectedCategory === 'Semua' ? products : products.filter((item) => item.category === selectedCategory)).filter((item) =>
			matchesSearch(item.name, productSearch)
		)
	);

	onMount(loadData);

	async function loadData() {
		try {
			apiData = await loadPitakadoData();
		} finally {
			isLoading = false;
		}
	}

	function addToCart(product) {
		const exists = cart.find((item) => item.id === product.id);
		cart = exists
			? cart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
			: [...cart, { ...product, qty: 1 }];
	}

	function changeQty(id, delta) {
		cart = cart
			.map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
			.filter((item) => item.qty > 0);
	}

	async function submitTransaction() {
		if (!cart.length || isPaying) return;
		isPaying = true;

		try {
			const tanggal = new Date().toISOString().slice(0, 10);
			await createSalesTransaction({
				tanggal,
				modal: 0,
				transaction_type: transactionTypeFor(paymentMethod),
				is_event: false,
				event_type: null,
				details: cart.map((item) => ({
					product_id: item.id,
					qty: item.qty
				}))
			});
			cart = [];
			customerName = '';
			toast = 'Transaksi berhasil disimpan.';
			await loadData();
		} catch (error) {
			toast = error.message || 'Gagal menyimpan transaksi.';
		} finally {
			isPaying = false;
		}
	}

	function transactionTypeFor(method) {
		if (method === 'QRIS') return 'qris';
		if (method === 'Kartu') return 'card';
		return 'cash';
	}
</script>

{#if isLoading}
	<SkeletonScreen />
{:else}
	<div class="grid gap-8 xl:grid-cols-[1fr_30rem]">
			<section class="min-w-0">
				<PageTitle title="Menu Kasir" subtitle="Pilih produk untuk transaksi" />
				<label class="mt-6 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
					<Icon name="search" size={20} />
					<input class="w-full bg-transparent outline-none" bind:value={productSearch} placeholder="Cari produk..." />
				</label>
				<div class="my-6 flex gap-3 overflow-x-auto pb-2">
					{#each categories as category}
						<button
							class={`shrink-0 rounded-full px-5 py-3 font-bold ${selectedCategory === category ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700 shadow-sm'}`}
							onclick={() => (selectedCategory = category)}
						>
							{category}
						</button>
					{/each}
				</div>
				<ProductGrid products={filteredProducts} {cart} onAdd={addToCart} />
			</section>

			<CartPanel
				{cart}
				{customerName}
				{paymentMethod}
				{isPaying}
				onCustomerChange={(value) => (customerName = value)}
				onPaymentChange={(value) => (paymentMethod = value)}
				onQtyChange={changeQty}
				onClear={() => (cart = [])}
				onSubmit={submitTransaction}
			/>
	</div>

	{#if toast}
		<div class="fixed bottom-6 right-6 z-50 rounded-2xl bg-forest px-5 py-4 font-semibold text-white shadow-soft">{toast}</div>
	{/if}
{/if}
