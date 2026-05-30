const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const AI_API_BASE_URL = import.meta.env.VITE_AI_API_BASE_URL || 'http://localhost:8000';
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || '';
const ENDPOINTS = {
	csrf: import.meta.env.VITE_API_CSRF_PATH || '/api/v1/xxdf',
	emailLogin: import.meta.env.VITE_API_EMAIL_LOGIN_PATH || '/auth/email',
	googleLogin: import.meta.env.VITE_API_GOOGLE_LOGIN_PATH || '/auth/google',
	logout: import.meta.env.VITE_API_LOGOUT_PATH || '/logout',
	user: import.meta.env.VITE_API_USER_PATH || '/api/v1/user',
	users: import.meta.env.VITE_API_USERS_PATH || '/api/v1/user/all',
	createUser: import.meta.env.VITE_API_CREATE_USER_PATH || '/api/v1/user/add',
	products: import.meta.env.VITE_API_PRODUCTS_PATH || '/api/v1/products',
	materials: import.meta.env.VITE_API_MATERIALS_PATH || '/api/v1/materials',
	sales: import.meta.env.VITE_API_SALES_PATH || '/api/v1/sales',
	salesSummary: import.meta.env.VITE_API_SALES_SUMMARY_PATH || '/api/v1/sales/analytics/summary',
	purchases: import.meta.env.VITE_API_PURCHASES_PATH || '/api/v1/material-purchases'
};
const AI_ENDPOINTS = {
	info: import.meta.env.VITE_AI_MODEL_INFO_PATH || '/api/v1/model/info',
	predict: import.meta.env.VITE_AI_MODEL_PREDICT_PATH || '/api/v1/model/predict',
	explain: import.meta.env.VITE_AI_MODEL_EXPLAIN_PATH || '/api/v1/model/explain',
	summary: import.meta.env.VITE_AI_MODEL_SUMMARY_PATH || '/api/v1/model/summary',
	chat: import.meta.env.VITE_AI_MODEL_CHAT_PATH || '/api/v1/model/chat'
};

export const googleLoginUrl = `${API_BASE_URL}${ENDPOINTS.googleLogin}`;

let csrfToken = '';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

async function parseResponse(response) {
	const payload = await response.json().catch(() => ({}));

	if (!response.ok || payload.success === false) {
		throw new Error(payload.error || payload.message || `Request failed: ${response.status}`);
	}

	return payload.data ?? payload;
}

export async function apiFetch(path, options = {}) {
	const method = (options.method || 'GET').toUpperCase();

	if (!SAFE_METHODS.includes(method) && !csrfToken && path !== ENDPOINTS.csrf) {
		await ensureCsrfToken();
	}

	const headers = {
		'Content-Type': 'application/json',
		...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
		...options.headers
	};

	const response = await fetch(`${API_BASE_URL}${path}`, {
		credentials: 'include',
		...options,
		method,
		headers
	});

	return parseResponse(response);
}

export async function aiFetch(path, options = {}) {
	const headers = {
		'Content-Type': 'application/json',
		...(AI_API_KEY ? { 'X-API-Key': AI_API_KEY } : {}),
		...options.headers
	};

	const response = await fetch(`${AI_API_BASE_URL}${path}`, {
		...options,
		headers
	});

	return parseResponse(response);
}

export async function ensureCsrfToken() {
	if (csrfToken) return csrfToken;

	try {
		const data = await apiFetch(ENDPOINTS.csrf);
		csrfToken = data.csrfToken || data.token || data.csrf || '';
	} catch {
		csrfToken = '';
	}

	return csrfToken;
}

export async function getCurrentUser() {
	await ensureCsrfToken();
	const user = normalizeUser(await apiFetch(ENDPOINTS.user));
	if (user && !isUserVerified(user)) {
		throw new Error('Akun belum diverifikasi admin.');
	}
	return user;
}

export async function loginWithEmail({ email, password }) {
	await ensureCsrfToken();

	const loginData = await apiFetch(ENDPOINTS.emailLogin, {
		method: 'POST',
		body: JSON.stringify({ email, password })
	});
	const user = normalizeUser(await apiFetch(ENDPOINTS.user));

	if (user && !isUserVerified(user)) {
		await logoutUser().catch(() => {});
		throw new Error('Akun belum diverifikasi admin.');
	}

	return user || loginData;
}

export async function logoutUser() {
	return apiFetch(ENDPOINTS.logout);
}

export async function getAllUsers() {
	await ensureCsrfToken();
	return normalizeList(await apiFetch(ENDPOINTS.users));
}

export async function createUser(payload) {
	await ensureCsrfToken();
	return apiFetch(ENDPOINTS.createUser, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function updateUser(id, payload) {
	await ensureCsrfToken();
	return apiFetch(`${ENDPOINTS.user}/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
}

export async function updateUserVerification(id, statusVerified) {
	await ensureCsrfToken();
	return apiFetch(`${ENDPOINTS.user}/${id}/status-verified`, {
		method: 'PATCH',
		body: JSON.stringify({ status_verified: statusVerified })
	});
}

export async function deleteUser(id) {
	await ensureCsrfToken();
	return apiFetch(`${ENDPOINTS.user}/${id}`, {
		method: 'DELETE'
	});
}

export async function createSalesTransaction(payload) {
	await ensureCsrfToken();

	return apiFetch(ENDPOINTS.sales, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function createMaterial(payload) {
	return apiFetch(ENDPOINTS.materials, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function updateMaterial(id, payload) {
	return apiFetch(`${ENDPOINTS.materials}/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
}

export async function deleteMaterial(id) {
	return apiFetch(`${ENDPOINTS.materials}/${id}`, {
		method: 'DELETE'
	});
}

export async function createProduct(payload) {
	return apiFetch(ENDPOINTS.products, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function updateProduct(id, payload) {
	return apiFetch(`${ENDPOINTS.products}/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
}

export async function deleteProduct(id) {
	return apiFetch(`${ENDPOINTS.products}/${id}`, {
		method: 'DELETE'
	});
}

export async function createPurchase(payload) {
	return apiFetch(ENDPOINTS.purchases, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function updatePurchase(id, payload) {
	return apiFetch(`${ENDPOINTS.purchases}/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
}

export async function deletePurchase(id) {
	return apiFetch(`${ENDPOINTS.purchases}/${id}`, {
		method: 'DELETE'
	});
}

export async function updateSale(id, payload) {
	return apiFetch(`${ENDPOINTS.sales}/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
}

export async function deleteSale(id) {
	return apiFetch(`${ENDPOINTS.sales}/${id}`, {
		method: 'DELETE'
	});
}

export async function loadAIInsights(products = [], sales = [], config = {}) {
	const items = buildPredictionItems(products, sales);
	const requestConfig = {
		forecast_horizon_days: Number(config.forecast_horizon_days || 7),
		confidence_interval: Number(config.confidence_interval || 0.95)
	};
	const modelInfo = await aiFetch(AI_ENDPOINTS.info);
	const prediction = items.length
		? await loadBatchedPrediction(items, requestConfig)
		: {
				summary: {
					detected_upcoming_events: [],
					unmatched_products: []
				},
				predictions: [],
				material_requirements: []
			};

	return {
		modelInfo,
		prediction,
		requestConfig
	};
}

async function loadBatchedPrediction(items, requestConfig) {
	const totalHorizon = Math.max(1, Number(requestConfig.forecast_horizon_days || 7));
	const confidenceInterval = Number(requestConfig.confidence_interval || 0.95);
	const workingItems = items.map((item) => ({
		...item,
		historical_sequence: [...(item.historical_sequence || [])],
		known_future_events: [...(item.known_future_events || [])]
	}));
	const batches = [];
	let remainingDays = totalHorizon;

	while (remainingDays > 0) {
		const forecastDays = Math.min(7, remainingDays);
		const batch = await aiFetch(AI_ENDPOINTS.predict, {
			method: 'POST',
			body: JSON.stringify({
				request_config: {
					forecast_horizon_days: forecastDays,
					confidence_interval: confidenceInterval
				},
				items: workingItems
			})
		});
		batches.push(batch);
		appendForecastsToHistory(workingItems, batch?.predictions || []);
		remainingDays -= forecastDays;
	}

	return mergePredictionBatches(batches);
}

function appendForecastsToHistory(items, predictions) {
	for (const item of items) {
		const prediction = predictions.find((entry) => String(entry.item_id || entry.product_name) === String(item.item_id));
		if (!prediction?.daily_forecasts?.length) continue;
		const forecastHistory = prediction.daily_forecasts.map((point) => ({
			date: point.date,
			sales_qty: Math.max(0, Number(point.predicted_demand || 0)),
			is_holiday: Boolean(point.is_holiday),
			has_promo: Boolean(point.has_promo)
		}));
		item.historical_sequence = [...item.historical_sequence, ...forecastHistory].slice(-14);
	}
}

function mergePredictionBatches(batches) {
	const mergedPredictions = new Map();

	for (const batch of batches) {
		for (const prediction of batch?.predictions || []) {
			const key = String(prediction.item_id || prediction.product_name || mergedPredictions.size);
			const existing = mergedPredictions.get(key) || { ...prediction, daily_forecasts: [] };
			const dailyForecasts = [...(existing.daily_forecasts || []), ...(prediction.daily_forecasts || [])];
			mergedPredictions.set(key, {
				...existing,
				...prediction,
				daily_forecasts: dailyForecasts,
				forecast_summary: summarizeForecasts(prediction.forecast_summary, dailyForecasts)
			});
		}
	}

	const lastBatch = batches[batches.length - 1] || {};
	const firstBatch = batches[0] || {};
	return {
		...lastBatch,
		summary: {
			...(firstBatch.summary || {}),
			...(lastBatch.summary || {})
		},
		predictions: [...mergedPredictions.values()],
		material_requirements: lastBatch.material_requirements || []
	};
}

function summarizeForecasts(fallbackSummary = {}, dailyForecasts = []) {
	const totalDemand = dailyForecasts.reduce((sum, point) => sum + Number(point.predicted_demand || 0), 0);
	const peak = dailyForecasts.reduce(
		(best, point) => (Number(point.predicted_demand || 0) > Number(best?.predicted_demand || 0) ? point : best),
		null
	);

	return {
		...fallbackSummary,
		total_estimated_demand: totalDemand,
		peak_demand_date: peak?.date || fallbackSummary.peak_demand_date
	};
}

export async function explainAIInsights(predictionData, language = 'id') {
	return aiFetch(AI_ENDPOINTS.explain, {
		method: 'POST',
		body: JSON.stringify({
			prediction_data: predictionData,
			language
		})
	});
}

export async function loadPitakadoData() {
	await ensureCsrfToken();

	const [user, products, materials, sales, summary, purchases] = await Promise.allSettled([
		apiFetch(ENDPOINTS.user),
		apiFetch(ENDPOINTS.products),
		apiFetch(ENDPOINTS.materials),
		apiFetch(ENDPOINTS.sales),
		apiFetch(ENDPOINTS.salesSummary),
		apiFetch(ENDPOINTS.purchases)
	]);
	const settled = [user, products, materials, sales, summary, purchases];

	return {
		hasLiveData: settled.some((request) => request.status === 'fulfilled'),
		user: user.status === 'fulfilled' ? normalizeUser(user.value) : null,
		products: products.status === 'fulfilled' ? normalizeList(products.value) : [],
		materials: materials.status === 'fulfilled' ? normalizeList(materials.value) : [],
		sales: sales.status === 'fulfilled' ? normalizeList(sales.value) : [],
		summary: summary.status === 'fulfilled' ? summary.value : null,
		purchases: purchases.status === 'fulfilled' ? normalizeList(purchases.value) : []
	};
}

function normalizeUser(value) {
	return value?.user || value?.profile || value || null;
}

function isUserVerified(user) {
	return user?.roles === 'super-admin' || String(user.status_verified || 'verified') === 'verified';
}

function normalizeList(value) {
	if (Array.isArray(value)) return value;
	if (Array.isArray(value?.items)) return value.items;
	if (Array.isArray(value?.data)) return value.data;
	if (Array.isArray(value?.rows)) return value.rows;
	return [];
}

function buildPredictionItems(products, sales) {
	const sourceProducts = products.slice(0, 4);

	return sourceProducts.map((product, productIndex) => ({
		item_id: String(product.id || product.name || `ITEM-${productIndex + 1}`),
		static_features: {
			product_name: product.name,
			current_stock: Number(product.stock || 0),
			price: Number(product.price || 0),
			category: product.category || 'Produk'
		},
		historical_sequence: buildHistoricalSequence(product, sales),
		known_future_events: buildFutureEvents(sales)
	}));
}

function buildHistoricalSequence(product, sales) {
	const today = new Date();
	const productName = String(product.name || '').toLowerCase();

	return Array.from({ length: 14 }, (_, index) => {
		const day = new Date(today);
		day.setDate(today.getDate() - (13 - index));
		const dateKey = day.toISOString().slice(0, 10);
		const matchingSales = sales.filter((sale) => {
			const saleDate = String(sale.tanggal || sale.date || sale.created_at || '').slice(0, 10);
			const saleProduct = String(sale.produk || sale.product || sale.nama_barang || '').toLowerCase();
			return saleDate === dateKey && (!saleProduct || saleProduct.includes(productName) || productName.includes(saleProduct));
		});
		const salesQty = matchingSales.reduce((sum, sale) => sum + Number(sale.qty || sale.quantity || 0), 0);

		return {
			date: dateKey,
			sales_qty: Math.max(0, salesQty),
			is_holiday: false,
			has_promo: Boolean(matchingSales.some((sale) => sale.is_event || sale.event_type))
		};
	});
}

function buildFutureEvents(sales) {
	const today = new Date();
	return sales
		.filter((sale) => sale.is_event || sale.event_type)
		.slice(0, 7)
		.map((sale) => {
			const day = new Date(today);
			day.setDate(today.getDate() + 1);
			return {
				date: String(sale.tanggal || sale.date || day.toISOString()).slice(0, 10),
				event_name: sale.event_type || 'Event Penjualan',
				is_holiday: false,
				has_promo: true,
				impact: 'HIGH'
			};
		});
}
