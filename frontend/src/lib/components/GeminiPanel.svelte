<script>
	let { explanation = null, isLoading = false, error = '' } = $props();

	let content = $derived(
		explanation?.explanation_text ||
			explanation?.explanation ||
			explanation?.summary ||
			explanation?.message ||
			''
	);
	let generatedBy = $derived(explanation?.generated_by || explanation?.model || '');
	let renderedContent = $derived(markdownToHtml(content || JSON.stringify(explanation, null, 2)));

	function escapeHtml(value) {
		return String(value || '')
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#039;');
	}

	function inlineMarkdown(value) {
		return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	}

	function markdownToHtml(value) {
		const lines = String(value || '').split('\n');
		let isListOpen = false;
		const html = [];

		for (const line of lines) {
			const trimmed = line.trim();

			if (!trimmed) {
				if (isListOpen) {
					html.push('</ol>');
					isListOpen = false;
				}
				continue;
			}

			const listItem = trimmed.match(/^\d+\.\s+(.*)$/);
			if (listItem) {
				if (!isListOpen) {
					html.push('<ol class="space-y-4">');
					isListOpen = true;
				}
				html.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
				continue;
			}

			if (isListOpen) {
				html.push('</ol>');
				isListOpen = false;
			}
			html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
		}

		if (isListOpen) html.push('</ol>');
		return html.join('');
	}
</script>

<section class="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 sm:p-8">
	<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 class="text-2xl font-semibold">Penjelasan Gemini</h2>
			<p class="text-slate-600">Ringkasan risiko, alasan, dan langkah berikutnya dari endpoint AI.</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<span class="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">LIVE AI</span>
			{#if generatedBy}
				<span class="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white">{generatedBy}</span>
			{/if}
		</div>
	</div>
	{#if isLoading}
		<div class="space-y-3">
			<div class="h-4 w-2/3 animate-pulse rounded bg-emerald-200"></div>
			<div class="h-4 w-full animate-pulse rounded bg-emerald-200"></div>
			<div class="h-4 w-4/5 animate-pulse rounded bg-emerald-200"></div>
		</div>
	{:else if error}
		<p class="text-sm font-semibold text-orange-700">{error}</p>
	{:else if explanation}
		<div class="gemini-markdown text-slate-700">
			{@html renderedContent}
		</div>
	{:else}
		<p class="text-slate-600">Endpoint explain belum mengembalikan data.</p>
	{/if}
</section>

<style>
	.gemini-markdown {
		line-height: 1.75;
	}

	.gemini-markdown :global(p) {
		margin: 0 0 1rem;
	}

	.gemini-markdown :global(ol) {
		margin: 0;
		padding-left: 1.35rem;
	}

	.gemini-markdown :global(li) {
		padding-left: 0.35rem;
	}

	.gemini-markdown :global(strong) {
		color: #047857;
		font-weight: 800;
	}
</style>
