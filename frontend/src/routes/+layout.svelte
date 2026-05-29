<script>
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import AppShell from '$lib/components/AppShell.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
	<script src="https://cdn.tailwindcss.com"></script>
	<script>
		tailwind.config = {
			theme: {
				extend: {
					colors: {
						brand: '#00e696',
						forest: '#003f2f',
						ink: '#111827'
					},
					fontFamily: {
						sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif']
					},
					boxShadow: {
						soft: '0 18px 45px rgba(15, 23, 42, 0.08)'
					}
				}
			}
		};
	</script>
</svelte:head>

{#if page.url.pathname === '/login'}
	{@render children()}
{:else}
	<AppShell>
		{@render children()}
	</AppShell>
{/if}

<style>
	:global(body) {
		margin: 0;
		font-family:
			'Manrope',
			ui-sans-serif,
			system-ui,
			sans-serif;
		font-weight: 400;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: geometricPrecision;
	}

	:global(button),
	:global(input) {
		font: inherit;
	}
</style>
