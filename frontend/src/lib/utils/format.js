export function money(value) {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(Number(value || 0));
}

export function compactMoney(value) {
	const number = Number(value || 0);
	return `Rp ${(number / 1000000).toFixed(number >= 10000000 ? 1 : 0)}M`;
}

export function getInitials(value) {
	return (
		String(value || '-')
			.split(/[\s@._-]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || '-'
	);
}

export function getDisplayName(user) {
	const username = String(user?.username || '').trim();
	if (username) return username;

	const email = String(user?.email || '').trim();
	if (email) {
		const localName = email.split('@')[0].replaceAll(/[._-]+/g, ' ').trim();
		return localName || email;
	}

	return user?.roles || '-';
}

export function getAvatarUrl(user) {
	const avatarUrl = String(user?.avatar_url || '').trim();
	if (!avatarUrl || avatarUrl.includes('via.placeholder.com')) return '';
	return avatarUrl;
}

export function matchesSearch(value, query) {
	return String(value || '').toLowerCase().includes(String(query || '').trim().toLowerCase());
}
