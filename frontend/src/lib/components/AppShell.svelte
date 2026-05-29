<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { getCurrentUser, logoutUser } from '$lib/api.js';
	import { getAvatarUrl, getDisplayName, getInitials } from '$lib/utils/format.js';
	import Icon from './Icon.svelte';
	import SkeletonScreen from './SkeletonScreen.svelte';
	import TopLoadingBar from './TopLoadingBar.svelte';

	let { children } = $props();
	let user = $state(null);
	let isLoading = $state(true);
	let mobileNavOpen = $state(false);
	let profileMenuOpen = $state(false);
	let toast = $state('');
	let toastTimeout;

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'grid' },
		{ href: '/kasir', label: 'Menu Kasir', icon: 'cart' },
		{ href: '/laporan', label: 'Laporan', icon: 'report' },
		{ href: '/ai', label: 'AI Prediksi', icon: 'brain' },
		{ href: '/admin/data', label: 'Manajemen Data', icon: 'settings', adminOnly: true },
		{ href: '/admin/users', label: 'User', icon: 'users', adminOnly: true }
	];

	let userLabel = $derived(isLoading ? 'Memuat profil' : getDisplayName(user));
	let userInitials = $derived(getInitials(userLabel));
	let userAvatarUrl = $derived(getAvatarUrl(user));
	let visibleNavItems = $derived(
		navItems.filter((item) => !item.adminOnly || ['admin', 'super-admin'].includes(user?.roles))
	);

	onMount(async () => {
		try {
			user = await getCurrentUser();
			if (!user) await goto('/login');
		} catch (error) {
			if (error.message) sessionStorage.setItem('auth_error', error.message);
			await goto('/login');
		} finally {
			isLoading = false;
		}
	});

	async function handleLogout() {
		try {
			await logoutUser();
		} catch {
			// Session may already be expired.
		}
		await goto('/login');
	}

	function toggleProfileMenu() {
		if (isLoading) return;
		profileMenuOpen = !profileMenuOpen;
	}

	function showToast(message) {
		toast = message;
		window.clearTimeout(toastTimeout);
		toastTimeout = window.setTimeout(() => {
			toast = '';
		}, 2400);
	}

	function isActive(href) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<div class="min-h-screen bg-[#f4f7f6] text-ink">
	{#if isLoading}
		<TopLoadingBar />
	{/if}
	<aside
		class={`fixed inset-y-0 left-0 z-40 w-72 bg-forest text-white transition-transform duration-300 lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
	>
		<div class="flex h-full flex-col px-5 py-8">
			<div class="mb-10 text-3xl font-bold tracking-tight text-brand">Pitakado</div>
			<nav class="space-y-2">
				{#each visibleNavItems as item}
					<a
						class={`flex w-full items-center gap-4 rounded-[18px] px-5 py-4 text-left text-lg font-semibold transition ${isActive(item.href) ? 'bg-white/15 text-brand' : 'text-emerald-100/70 hover:bg-white/10 hover:text-white'}`}
						href={item.href}
						onclick={() => (mobileNavOpen = false)}
					>
						<span class="shrink-0"><Icon name={item.icon} /></span>
						{item.label}
					</a>
				{/each}
			</nav>
			<a
				class="mt-auto rounded-[18px] bg-brand px-6 py-5 text-center text-xl font-semibold text-emerald-950 shadow-lg shadow-emerald-950/20"
				href="/kasir"
			>
				Buka Kasir
			</a>
		</div>
	</aside>

	{#if mobileNavOpen}
		<button
			class="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
			aria-label="Tutup menu"
			onclick={() => (mobileNavOpen = false)}
		></button>
	{/if}

	<div class="lg:pl-72">
		<header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
			<div class="flex h-20 items-center gap-4 px-5 sm:px-8 lg:px-10">
				<button class="rounded-xl bg-emerald-50 p-3 text-forest lg:hidden" onclick={() => (mobileNavOpen = true)}>
					<Icon name="grid" />
				</button>
				<div class="ml-auto hidden items-center gap-4 text-slate-600 sm:flex">
					{#if isLoading}
						<div class="h-6 w-32 animate-pulse rounded-full bg-slate-200"></div>
						<div class="h-10 w-10 animate-pulse rounded-full bg-emerald-100"></div>
					{:else}
						<div class="relative">
							<button class="flex items-center gap-4 rounded-2xl px-2 py-1 hover:bg-slate-100" onclick={toggleProfileMenu}>
								<span class="text-xl text-ink">{userLabel}</span>
								<span class="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-brand font-bold text-forest">
									{#if userAvatarUrl}
										<img class="h-full w-full object-cover" src={userAvatarUrl} alt="" />
									{:else}
										{userInitials}
									{/if}
								</span>
							</button>

							{#if profileMenuOpen}
								<div class="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-soft">
									<div class="flex items-center gap-3 border-b border-slate-100 px-3 py-3">
										<span class="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-brand font-bold text-forest">
											{#if userAvatarUrl}
												<img class="h-full w-full object-cover" src={userAvatarUrl} alt="" />
											{:else}
												{userInitials}
											{/if}
										</span>
										<div class="min-w-0">
											<p class="truncate font-bold text-ink">{userLabel}</p>
											<p class="truncate text-sm text-slate-500">{user?.email || user?.roles || '-'}</p>
										</div>
									</div>
									<a class="mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 font-semibold text-slate-700 hover:bg-slate-100" href="/profile" onclick={() => (profileMenuOpen = false)}>
										<Icon name="users" size={18} /> Profil Saya
									</a>
									<button class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-semibold text-red-600 hover:bg-red-50" onclick={handleLogout}>
										<Icon name="x" size={18} /> Logout
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</header>

		<main class="min-h-[calc(100vh-5rem)] p-5 sm:p-8 lg:p-10">
			{#if isLoading}
				<SkeletonScreen showBar={false} />
			{:else}
				{@render children()}
			{/if}
		</main>
	</div>
</div>

{#if toast}
	<div class="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl bg-forest px-5 py-4 text-sm font-medium text-white shadow-soft">
		{toast}
	</div>
{/if}
