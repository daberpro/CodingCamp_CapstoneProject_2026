<script>
	let {
		total = 0,
		page = $bindable(1),
		pageSize = $bindable(10),
		pageSizeOptions = [5, 10, 20, 50]
	} = $props();

	let totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
	let start = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	let end = $derived(Math.min(total, page * pageSize));

	$effect(() => {
		if (page > totalPages) page = totalPages;
		if (page < 1) page = 1;
	});

	function changePageSize(value) {
		pageSize = Number(value);
		page = 1;
	}
</script>

<div class="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
	<p>Menampilkan {start}-{end} dari {total} data</p>
	<div class="flex flex-wrap items-center gap-3">
		<label class="flex items-center gap-2">
			<span>Baris</span>
			<select class="rounded-xl bg-slate-100 px-3 py-2 font-semibold outline-none" value={pageSize} onchange={(event) => changePageSize(event.currentTarget.value)}>
				{#each pageSizeOptions as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</label>
		<div class="flex items-center gap-2">
			<button class="rounded-xl bg-slate-100 px-3 py-2 font-bold disabled:text-slate-300" disabled={page <= 1} onclick={() => (page -= 1)}>
				Prev
			</button>
			<span class="min-w-20 text-center font-bold text-slate-700">{page} / {totalPages}</span>
			<button class="rounded-xl bg-slate-100 px-3 py-2 font-bold disabled:text-slate-300" disabled={page >= totalPages} onclick={() => (page += 1)}>
				Next
			</button>
		</div>
	</div>
</div>
