import { compactMoney, money } from './format.js';

export function mapProducts(materials = []) {
	return materials.map((item, index) => ({
		id: item.material_id || item.id || index + 1,
		icon: pickProductIcon(item.nama_barang || item.name || ''),
		name: item.nama_barang || item.name || `Produk ${index + 1}`,
		category: item.category || item.unit_type || 'Material',
		price: Number(item.harga_jual || item.price || item.harga_satuan || 0),
		stock: Number(item.current_stock || item.stock || item.qty || 0)
	}));
}

export function mapSalesProducts(products = []) {
	return products.map((item, index) => ({
		id: item.id || index + 1,
		icon: pickProductIcon(item.nama_produk || item.name || ''),
		name: item.nama_produk || item.name || `Produk ${index + 1}`,
		category: item.category || 'Produk',
		price: Number(item.harga_jual || item.price || 0),
		stock: item.current_stock ?? item.stock ?? null
	}));
}

export function mapTransactions(sales = []) {
	return sales.map((item, index) => ({
		id: `#TRX-${item.id || 9400 + index}`,
		rawDate: item.created_at || item.tanggal || item.date || new Date().toISOString(),
		time: new Date(item.created_at || item.tanggal || Date.now()).toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit'
		}),
		cashier: item.kasir || item.cashier || '-',
		items: `${item.qty || item.quantity || 0} item`,
		total: Number(item.harga_jual || item.total || 0),
		method: item.metode || item.method || '-',
		status: item.status || '-'
	}));
}

export function mapPurchases(purchasesData = []) {
	return purchasesData.map((item, index) => {
		const qty = Number(item.qty || item.quantity || 0);
		const unitPrice = Number(item.harga_satuan || item.unit_price || item.price || 0);
		return {
			id: item.id || index + 1,
			date: item.tanggal || item.date || item.created_at || new Date().toISOString(),
			materialId: item.material_id || item.materialId || '',
			qty,
			unitPrice,
			total: Number(item.total || qty * unitPrice || 0)
		};
	});
}

export function getReportMetrics(period, transactionRows, purchaseRows) {
	const periodTransactions = filterByPeriod(transactionRows, period, 'rawDate');
	const periodPurchases = filterByPeriod(purchaseRows, period, 'date');
	const income = periodTransactions.reduce((sum, item) => sum + Number(item.total || 0), 0);
	const expense = periodPurchases.reduce((sum, item) => sum + Number(item.total || 0), 0);

	return {
		income: compactMoney(income),
		expense: compactMoney(expense),
		profit: compactMoney(income - expense),
		count: String(periodTransactions.length)
	};
}

export function getDashboardMetrics(transactionRows, productRows, predictions, range) {
	const rangedTransactions = filterByDashboardRange(transactionRows, range);
	const cash = rangedTransactions.reduce((sum, item) => sum + Number(item.total || 0), 0);
	const stockItems = productRows.reduce((sum, item) => sum + Number(item.stock || 0), 0);
	const criticalCount = predictions.filter((item) => item.alert?.status === 'CRITICAL').length;

	return {
		cash: money(cash),
		stockItems: String(stockItems),
		riskLevel: criticalCount ? 'High' : predictions.length ? 'Low' : '-',
		riskBadge: predictions.length ? `${criticalCount} Critical` : 'No AI Data',
		transactionGrowth: `${rangedTransactions.length} transaksi`,
		stockBadge: `${productRows.length} produk`
	};
}

export function buildWeeklySeries(transactionRows, purchaseRows, aiPredictions = [], products = []) {
	const today = new Date();
	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(today);
		date.setDate(today.getDate() - (6 - index));
		const dateKey = date.toISOString().slice(0, 10);
		const revenue = transactionRows
			.filter((item) => String(item.rawDate || '').slice(0, 10) === dateKey)
			.reduce((sum, item) => sum + Number(item.total || 0), 0);
		const expense = purchaseRows
			.filter((item) => String(item.date || '').slice(0, 10) === dateKey)
			.reduce((sum, item) => sum + Number(item.total || 0), 0);
		const averagePrice =
			products.length > 0 ? products.reduce((sum, item) => sum + Number(item.price || 0), 0) / products.length : 0;
		const forecast =
			aiPredictions.reduce((sum, item) => {
				const point = item.daily_forecasts?.find((entry) => entry.date === dateKey);
				return sum + Number(point?.predicted_demand || 0);
			}, 0) * averagePrice;

		return {
			day: date.toLocaleDateString('id-ID', { weekday: 'short' }),
			revenue,
			expense,
			forecast
		};
	});
}

export function buildAIModelCards(modelInfo) {
	if (!modelInfo) return [];
	return [
		['Forecast Model', '100%', modelInfo.model_name || '-', 'AKTIF'],
		['Model Version', '100%', modelInfo.version || '-', 'AKTIF'],
		['Forecast Horizon', '100%', `${modelInfo.config?.forecast_horizon_days || '-'} hari ke depan`, 'AKTIF'],
		['Lookback Window', '100%', `${modelInfo.config?.look_back_days || '-'} hari histori`, 'AKTIF']
	];
}

export function buildAIRisks(predictions) {
	return predictions.slice(0, 4).map((item) => {
		const status = item.alert?.status || 'NORMAL';
		const totalDemand = item.forecast_summary?.total_estimated_demand || 0;
		const stock = item.alert?.current_stock || 0;
		const daysOut = item.alert?.days_until_out_of_stock;
		const isCritical = status === 'CRITICAL';

		return [
			item.product_name || item.item_id,
			`Prediksi demand ${totalDemand} unit dengan stok tersedia ${stock} unit.`,
			isCritical
				? `Restock ${item.recommendation?.suggested_quantity || Math.max(0, totalDemand - stock)} unit sebelum stok habis${daysOut ? ` dalam ${daysOut} hari` : ''}.`
				: 'Stok aman, lanjut monitor demand harian.',
			isCritical ? 'Tinggi' : 'Rendah'
		];
	});
}

export function buildAIRecommendations(predictions) {
	return predictions.slice(0, 4).map((item) => {
		const action = item.recommendation?.action || 'MONITOR_STOCK';
		const quantity = item.recommendation?.suggested_quantity || 0;
		const peakDate = item.forecast_summary?.peak_demand_date || '-';
		const isUrgent = action === 'URGENT_RESTOCK';

		return [
			isUrgent ? `Restock ${item.product_name || item.item_id}` : `Monitor ${item.product_name || item.item_id}`,
			isUrgent
				? `Tambahkan minimal ${quantity} unit untuk menghadapi peak demand pada ${peakDate}.`
				: `Demand masih aman. Jadwalkan produksi mendekati peak date ${peakDate}.`,
			isUrgent ? 'Prioritas Tinggi' : 'Prioritas Rendah'
		];
	});
}

export function buildAIStats(predictions, materials, modelInfo) {
	const totalDemand = predictions.reduce(
		(sum, item) => sum + Number(item.forecast_summary?.total_estimated_demand || 0),
		0
	);
	const criticalCount = predictions.filter((item) => item.alert?.status === 'CRITICAL').length;
	const topMaterial = [...materials].sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))[0];

	return [
		['Total Demand 7 Hari', `${totalDemand} unit`],
		['Produk Critical', `${criticalCount} produk`],
		['Bahan Prioritas', topMaterial ? `${topMaterial.material_name} (${topMaterial.quantity})` : '-'],
		['Model Version', modelInfo?.version || '-']
	];
}

export function filterByPeriod(rows, period, dateKey) {
	const now = new Date();
	const start = new Date(now);
	if (period === 'Hari Ini') start.setHours(0, 0, 0, 0);
	if (period === 'Minggu Ini') start.setDate(now.getDate() - 6);
	if (period === 'Bulan Ini') start.setDate(now.getDate() - 29);
	if (period === 'Tahun Ini') start.setMonth(0, 1);
	start.setHours(0, 0, 0, 0);

	return rows.filter((row) => {
		const rowDate = new Date(row[dateKey] || row.date || row.rawDate || Date.now());
		return rowDate >= start && rowDate <= now;
	});
}

function filterByDashboardRange(rows, range) {
	const period = range === 'Hari Ini' ? 'Hari Ini' : range === '30 Hari Terakhir' ? 'Bulan Ini' : 'Minggu Ini';
	return filterByPeriod(rows, period, 'rawDate');
}

function pickProductIcon(name) {
	const lower = String(name || '').toLowerCase();
	if (lower.includes('mawar')) return '🌹';
	if (lower.includes('tulip')) return '🌷';
	if (lower.includes('sunflower')) return '🌻';
	if (lower.includes('snack')) return '🍫';
	return '💐';
}
