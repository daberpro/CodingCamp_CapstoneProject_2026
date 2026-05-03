import express from "express";
import { supabase } from '../connection.js';
import { cekAutentikasi } from '../middleware/AuthMiddleware.js';

export const SalesRoute = express.Router();

// ===== GET - Ambil semua sales transactions
SalesRoute.get("/", cekAutentikasi, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales_transactions')
            .select('*')
            .order('tanggal', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET - Ambil sales transaction by ID
SalesRoute.get("/:id", cekAutentikasi, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('sales_transactions')
            .select('*')
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

// ===== POST - Buat sales transaction baru
SalesRoute.post("/", cekAutentikasi, async (req, res) => {
    try {
        const { tanggal, produk, qty, harga_jual, modal, profit, is_event, event_type } = req.body;

        // Validasi input
        if (!tanggal || !produk || !qty || !harga_jual) {
            return res.status(400).json({ 
                success: false, 
                error: "tanggal, produk, qty, dan harga_jual harus diisi" 
            });
        }

        const { data, error } = await supabase
            .from('sales_transactions')
            .insert([{
                tanggal,
                produk,
                qty: parseInt(qty),
                harga_jual: parseFloat(harga_jual),
                modal: modal ? parseFloat(modal) : 0,
                profit: profit ? parseFloat(profit) : 0,
                is_event: is_event || false,
                event_type: event_type || null,
                created_at: new Date()
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, message: "Transaksi berhasil dicatat", data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== PUT - Update sales transaction
SalesRoute.put("/:id", cekAutentikasi, async (req, res) => {
    try {
        const { id } = req.params;
        const { tanggal, produk, qty, harga_jual, modal, profit, is_event, event_type } = req.body;

        const { data, error } = await supabase
            .from('sales_transactions')
            .update({
                tanggal,
                produk,
                qty: qty !== undefined ? parseInt(qty) : undefined,
                harga_jual: harga_jual !== undefined ? parseFloat(harga_jual) : undefined,
                modal: modal !== undefined ? parseFloat(modal) : undefined,
                profit: profit !== undefined ? parseFloat(profit) : undefined,
                is_event,
                event_type
            })
            .eq('id', id)
            .select()
            .single();

        if (error || !data) throw error;
        res.json({ success: true, message: "Transaksi berhasil diupdate", data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== DELETE - Hapus sales transaction (Super admin only)
SalesRoute.delete("/:id", cekAutentikasi, async (req, res) => {
    try {
        // Check Role
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

// ===== GET - Dashboard analytics
SalesRoute.get("/analytics/summary", cekAutentikasi, async (req, res) => {
    try {
        // Total penjualan
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