<script>
	import EmptyState from './EmptyState.svelte';

	let { products = [], cart = [], onAdd = () => {} } = $props();

	function cartQty(id) {
		return cart.find((item) => item.id === id)?.qty || 0;
	}
</script>

{#if products.length === 0}
	<EmptyState title="Produk belum tersedia" message="Menu kasir akan terisi setelah endpoint products mengirim data produk." />
{:else}
	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each products as product}
			<button
				class={`relative min-h-40 rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${cartQty(product.id) ? 'border-brand bg-emerald-50' : 'border-slate-200'}`}
				onclick={() => onAdd(product)}
			>
				{#if cartQty(product.id)}
					<span class="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-emerald-700 text-sm font-bold text-white">{cartQty(product.id)}</span>
				{/if}
				<div class="text-3xl">{product.icon}</div>
				<h3 class="mt-5 line-clamp-2 font-bold">{product.name}</h3>
				<p class="mt-2 font-bold text-emerald-700">
					{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(product.price)}
				</p>
				{#if product.stock !== null && product.stock !== undefined}
					<p class="text-sm text-slate-500">Stok: {product.stock}</p>
				{/if}
			</button>
		{/each}
	</div>
{/if}
