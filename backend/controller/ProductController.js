import express from "express";
import { supabase } from "../connection.js";
import { cekAutentikasi } from "../middleware/AuthMiddleware.js";

export const ProductRoute = express.Router();

const PRODUCT_TABLE = "products";
const ADMIN_ROLES = ["admin", "super-admin"];

const isAdmin = (user) => ADMIN_ROLES.includes(user?.roles);

const validateProductInput = ({ nama_produk, harga_jual }, isUpdate = false) => {
  if (!isUpdate && (!nama_produk || harga_jual === undefined)) {
    return "nama_produk dan harga_jual harus diisi";
  }

  if (nama_produk !== undefined && String(nama_produk).trim() === "") {
    return "nama_produk tidak boleh kosong";
  }

  if (harga_jual !== undefined) {
    const numericPrice = Number(harga_jual);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return "harga_jual harus berupa angka dan tidak boleh kurang dari 0";
    }
  }

  return null;
};

// ===== GET - Ambil semua produk
ProductRoute.get("/", cekAutentikasi, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(PRODUCT_TABLE)
      .select("*")
      .order("nama_produk", { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== GET - Ambil produk by ID
ProductRoute.get("/:id", cekAutentikasi, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from(PRODUCT_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Produk tidak ditemukan",
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== POST - Tambah produk baru (Admin only)
ProductRoute.post("/", cekAutentikasi, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        error: "Hanya admin yang bisa menambah produk",
      });
    }

    const { nama_produk, harga_jual } = req.body;
    const validationError = validateProductInput({ nama_produk, harga_jual });

    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const { data, error } = await supabase
      .from(PRODUCT_TABLE)
      .insert([
        {
          nama_produk: String(nama_produk).trim(),
          harga_jual: Number(harga_jual),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan",
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PUT - Update produk (Admin only)
ProductRoute.put("/:id", cekAutentikasi, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        error: "Hanya admin yang bisa update produk",
      });
    }

    const { id } = req.params;
    const { nama_produk, harga_jual } = req.body;
    const validationError = validateProductInput({ nama_produk, harga_jual }, true);

    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const updateData = {};

    if (nama_produk !== undefined) updateData.nama_produk = String(nama_produk).trim();
    if (harga_jual !== undefined) updateData.harga_jual = Number(harga_jual);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Tidak ada data yang diberikan untuk diperbarui",
      });
    }

    const { data, error } = await supabase
      .from(PRODUCT_TABLE)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Produk tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Produk berhasil diupdate",
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== DELETE - Hapus produk (Admin only)
ProductRoute.delete("/:id", cekAutentikasi, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        error: "Hanya admin yang bisa menghapus produk",
      });
    }

    const { id } = req.params;
    const { data, error } = await supabase
      .from(PRODUCT_TABLE)
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Produk tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Produk berhasil dihapus",
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
