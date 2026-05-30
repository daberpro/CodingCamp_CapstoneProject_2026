import express from "express";
import { supabase } from '../connection.js';
import { cekAutentikasi } from '../middleware/AuthMiddleware.js';

export const SalesRoute = express.Router();

const TRANSACTION_TYPES = ['qris', 'cash', 'card'];
const DETAIL_SELECT = '*, product:products(*)';
const TRANSACTION_WITH_DETAILS_SELECT = '*, details:sales_transaction_details(*, product:products(*))';

const validateTransactionType = (transactionType) => {
    if (transactionType !== undefined && !TRANSACTION_TYPES.includes(transactionType)) {
        return "transaction_type harus salah satu dari qris, cash, atau card";
    }

    return null;
};

const validateTransactionDetailInput = ({ transaction_id, product_id, qty }, isUpdate = false) => {
    if (!isUpdate && (!transaction_id || !product_id || qty === undefined)) {
        return "transaction_id, product_id, dan qty harus diisi";
    }

    if (product_id !== undefined && String(product_id).trim() === "") {
        return "product_id tidak boleh kosong";
    }

    if (qty !== undefined) {
        const numericQty = Number(qty);

        if (!Number.isInteger(numericQty) || numericQty <= 0) {
            return "qty harus berupa angka bulat lebih besar dari 0";
        }
    }

    return null;
};

const getTransactionDetails = async (transactionId) => {
    return supabase
        .from('sales_transaction_details')
        .select(DETAIL_SELECT)
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });
};

const getProductsByIds = async (productIds) => {
    const uniqueIds = [...new Set(productIds)];
    const { data, error } = await supabase
        .from('products')
        .select('id, nama_produk, harga_jual')
        .in('id', uniqueIds);

    if (error) throw error;

    return data || [];
};

const buildDetailsPayload = async (details, transactionId) => {
    if (!Array.isArray(details) || details.length === 0) {
        return { payload: [], totalQty: 0, totalHargaJual: 0 };
    }

    for (const detail of details) {
        const validationError = validateTransactionDetailInput({
            transaction_id: transactionId || 'pending',
            product_id: detail.product_id,
            qty: detail.qty
        });

        if (validationError) {
            return { error: validationError };
        }
    }

    const products = await getProductsByIds(details.map((detail) => detail.product_id));
    const productById = new Map(products.map((product) => [product.id, product]));

    for (const detail of details) {
        if (!productById.has(detail.product_id)) {
            return { error: `Produk dengan ID ${detail.product_id} tidak ditemukan` };
        }
    }

    const totalQty = details.reduce((sum, detail) => sum + parseInt(detail.qty), 0);
    const totalHargaJual = details.reduce((sum, detail) => {
        const product = productById.get(detail.product_id);
        return sum + (Number(product.harga_jual) * parseInt(detail.qty));
    }, 0);

    return {
        payload: details.map((detail) => ({
            transaction_id: transactionId,
            product_id: detail.product_id,
            qty: parseInt(detail.qty),
            created_at: new Date()
        })),
        totalQty,
        totalHargaJual
    };
};

const createTransactionDetail = async (req, res, transactionId) => {
    try {
        const { product_id, qty } = req.body;
        const transaction_id = transactionId || req.body.transaction_id;
        const validationError = validateTransactionDetailInput({ transaction_id, product_id, qty });

        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }

        const { data: transaction, error: transactionError } = await supabase
            .from('sales_transactions')
            .select('id')
            .eq('id', transaction_id)
            .single();

        if (transactionError || !transaction) {
            return res.status(404).json({ success: false, error: "Transaksi tidak ditemukan" });
        }

        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id')
            .eq('id', product_id)
            .single();

        if (productError || !product) {
            return res.status(404).json({ success: false, error: "Produk tidak ditemukan" });
        }

        const { data, error } = await supabase
            .from('sales_transaction_details')
            .insert([{
                transaction_id,
                product_id,
                qty: parseInt(qty),
                created_at: new Date()
            }])
            .select(DETAIL_SELECT)
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, message: "Detail transaksi berhasil ditambahkan", data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ===== GET - Ambil semua sales transactions beserta detail dan produk
SalesRoute.get("/", cekAutentikasi, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales_transactions')
            .select(TRANSACTION_WITH_DETAILS_SELECT)
            .order('tanggal', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET - Dashboard analytics
SalesRoute.get("/analytics/summary", cekAutentikasi, async (req, res) => {
    try {
        const { data: allSales } = await supabase
            .from('sales_transactions')
            .select('harga_jual, profit');

        const totalRevenue = allSales?.reduce((sum, sale) => sum + sale.harga_jual, 0) || 0;
        const totalProfit = allSales?.reduce((sum, sale) => sum + sale.profit, 0) || 0;

        res.json({
            success: true,
            data: {
                total_revenue: totalRevenue,
                total_profit: totalProfit,
                total_transactions: allSales?.length || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET - Ambil semua detail transaksi beserta produk
SalesRoute.get("/details", cekAutentikasi, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales_transaction_details')
            .select(DETAIL_SELECT)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET - Ambil detail transaksi by detail ID beserta produk
SalesRoute.get("/details/:id", cekAutentikasi, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('sales_transaction_details')
            .select(DETAIL_SELECT)
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, error: "Detail transaksi tidak ditemukan" });
        }

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET - Ambil detail berdasarkan transaction_id beserta produk
SalesRoute.get("/:transactionId/details", cekAutentikasi, async (req, res) => {
    try {
        const { transactionId } = req.params;

        const { data: transaction, error: transactionError } = await supabase
            .from('sales_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (transactionError || !transaction) {
            return res.status(404).json({ success: false, error: "Transaksi tidak ditemukan" });
        }

        const { data: details, error: detailError } = await getTransactionDetails(transactionId);

        if (detailError) throw detailError;

        res.json({
            success: true,
            data: {
                transaction,
                details
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== POST - Tambah detail transaksi
SalesRoute.post("/details", cekAutentikasi, async (req, res) => {
    return createTransactionDetail(req, res);
});

// ===== POST - Tambah detail transaksi by transaction_id
SalesRoute.post("/:transactionId/details", cekAutentikasi, async (req, res) => {
    return createTransactionDetail(req, res, req.params.transactionId);
});

// ===== PUT - Update detail transaksi
SalesRoute.put("/details/:id", cekAutentikasi, async (req, res) => {
    try {
        const { id } = req.params;
        const { product_id, qty } = req.body;
        const validationError = validateTransactionDetailInput({ product_id, qty }, true);

        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }

        const updateData = {};

        if (product_id !== undefined) {
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('id', product_id)
                .single();

            if (productError || !product) {
                return res.status(404).json({ success: false, error: "Produk tidak ditemukan" });
            }

            updateData.product_id = product_id;
        }

        if (qty !== undefined) updateData.qty = parseInt(qty);

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: "Tidak ada data yang diberikan untuk diperbarui"
            });
        }

        const { data, error } = await supabase
            .from('sales_transaction_details')
            .update(updateData)
            .eq('id', id)
            .select(DETAIL_SELECT)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, error: "Detail transaksi tidak ditemukan" });
        }

        res.json({ success: true, message: "Detail transaksi berhasil diupdate", data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== DELETE - Hapus detail transaksi
SalesRoute.delete("/details/:id", cekAutentikasi, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('sales_transaction_details')
            .delete()
            .eq('id', id)
            .select(DETAIL_SELECT)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, error: "Detail transaksi tidak ditemukan" });
        }

        res.json({ success: true, message: "Detail transaksi berhasil dihapus", data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET - Ambil sales transaction by ID beserta detail dan produk
SalesRoute.get("/:id", cekAutentikasi, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('sales_transactions')
            .select(TRANSACTION_WITH_DETAILS_SELECT)
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, error: "Transaksi tidak ditemukan" });
        }

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== POST - Buat sales transaction baru, opsional sekaligus detail
SalesRoute.post("/", cekAutentikasi, async (req, res) => {
    try {
        const {
            tanggal,
            qty,
            harga_jual,
            modal,
            profit,
            is_event,
            event_type,
            transaction_type,
            details
        } = req.body;

        const transactionTypeError = validateTransactionType(transaction_type);

        if (transactionTypeError) {
            return res.status(400).json({ success: false, error: transactionTypeError });
        }

        if (!tanggal) {
            return res.status(400).json({ success: false, error: "tanggal harus diisi" });
        }

        let computedQty = qty !== undefined ? parseInt(qty) : undefined;
        let computedHargaJual = harga_jual !== undefined ? parseFloat(harga_jual) : undefined;

        if (Array.isArray(details) && details.length > 0) {
            const totals = await buildDetailsPayload(details, null);

            if (totals.error) {
                return res.status(400).json({ success: false, error: totals.error });
            }

            computedQty = computedQty !== undefined ? computedQty : totals.totalQty;
            computedHargaJual = computedHargaJual !== undefined ? computedHargaJual : totals.totalHargaJual;
        }

        if (!computedQty || !computedHargaJual) {
            return res.status(400).json({
                success: false,
                error: "qty dan harga_jual harus diisi jika details tidak dikirim"
            });
        }

        const numericModal = modal !== undefined ? parseFloat(modal) : 0;
        const numericProfit = profit !== undefined ? parseFloat(profit) : computedHargaJual - numericModal;

        const { data: transaction, error } = await supabase
            .from('sales_transactions')
            .insert([{
                tanggal,
                qty: computedQty,
                harga_jual: computedHargaJual,
                modal: numericModal,
                profit: numericProfit,
                is_event: is_event || false,
                event_type: event_type || null,
                transaction_type: transaction_type || 'cash',
                created_at: new Date()
            }])
            .select()
            .single();

        if (error) throw error;

        let insertedDetails = [];

        if (Array.isArray(details) && details.length > 0) {
            const detailsPayloadResult = await buildDetailsPayload(details, transaction.id);

            if (detailsPayloadResult.error) {
                await supabase.from('sales_transactions').delete().eq('id', transaction.id);
                return res.status(400).json({ success: false, error: detailsPayloadResult.error });
            }

            const { data: detailData, error: detailError } = await supabase
                .from('sales_transaction_details')
                .insert(detailsPayloadResult.payload)
                .select(DETAIL_SELECT);

            if (detailError) {
                await supabase.from('sales_transactions').delete().eq('id', transaction.id);
                throw detailError;
            }

            insertedDetails = detailData || [];
        }

        res.status(201).json({
            success: true,
            message: "Transaksi berhasil dicatat",
            data: {
                ...transaction,
                details: insertedDetails
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== PUT - Update sales transaction
SalesRoute.put("/:id", cekAutentikasi, async (req, res) => {
    try {
        const { id } = req.params;
        const { tanggal, qty, harga_jual, modal, profit, is_event, event_type, transaction_type } = req.body;
        const transactionTypeError = validateTransactionType(transaction_type);

        if (transactionTypeError) {
            return res.status(400).json({ success: false, error: transactionTypeError });
        }

        const updateData = {};

        if (tanggal !== undefined) updateData.tanggal = tanggal;
        if (qty !== undefined) updateData.qty = parseInt(qty);
        if (harga_jual !== undefined) updateData.harga_jual = parseFloat(harga_jual);
        if (modal !== undefined) updateData.modal = parseFloat(modal);
        if (profit !== undefined) updateData.profit = parseFloat(profit);
        if (is_event !== undefined) updateData.is_event = is_event;
        if (event_type !== undefined) updateData.event_type = event_type;
        if (transaction_type !== undefined) updateData.transaction_type = transaction_type;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: "Tidak ada data yang diberikan untuk diperbarui"
            });
        }

        const { data, error } = await supabase
            .from('sales_transactions')
            .update(updateData)
            .eq('id', id)
            .select(TRANSACTION_WITH_DETAILS_SELECT)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, error: "Transaksi tidak ditemukan" });
        }

        res.json({ success: true, message: "Transaksi berhasil diupdate", data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== DELETE - Hapus sales transaction (Super admin only)
SalesRoute.delete("/:id", cekAutentikasi, async (req, res) => {
    try {
        if (req.user.roles !== "super-admin") {
            return res.status(403).json({
                success: false,
                error: "Hanya super-admin yang bisa menghapus transaksi penjualan",
            });
        }

        const { id } = req.params;
        const { error } = await supabase
            .from('sales_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: "Transaksi berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
