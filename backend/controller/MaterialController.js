import express from "express";
import { supabase } from "../connection.js";
import { cekAutentikasi } from "../middleware/AuthMiddleware.js";

export const MaterialRoute = express.Router();

// ===== GET - Ambil semua materials
MaterialRoute.get("/", cekAutentikasi, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== GET - Ambil material by ID
MaterialRoute.get("/:id", cekAutentikasi, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("material_id", id)
      .single();

      if (error || !data) {
        return res
          .status(404)
          .json({ success: false, error: "Material tidak ditemukan" });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== POST - Tambah material baru (Admin only)
MaterialRoute.post("/", cekAutentikasi, async (req, res) => {
  try {
    // Check role
    if (req.user.roles === "kasir") {
      return res.status(403).json({
        success: false,
        error: "Hanya admin yang bisa menambah material",
      });
    }

    const {
      material_id,
      nama_barang,
      unit_type,
      usage_per_bouquet,
      lead_time,
      wastage_rate,
    } = req.body;

    // Validasi input
    if (!material_id || !nama_barang || !unit_type) {
      return res.status(400).json({
        success: false,
        error: "material_id, nama_barang, dan unit_type harus diisi",
      });
    }

    const { data, error } = await supabase
      .from("materials")
      .insert([
        {
          material_id,
          nama_barang,
          unit_type,
          current_stock: 0,
          usage_per_bouquet: usage_per_bouquet || 0,
          lead_time: lead_time || 0,
          wastage_rate: wastage_rate || 0,
          created_at: new Date(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res
      .status(201)
      .json({ success: true, message: "Material berhasil ditambahkan", data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PUT - Update material (Admin only)
MaterialRoute.put("/:id", cekAutentikasi, async (req, res) => {
  try {
    if (req.user.roles === "kasir") {
      return res.status(403).json({
        success: false,
        error: "Hanya admin yang bisa update material",
      });
    }

    const { id } = req.params;
    const {
      material_id,
      nama_barang,
      unit_type,
      usage_per_bouquet,
      lead_time,
      wastage_rate,
    } = req.body;

    const { data, error } = await supabase
      .from("materials")
      .update({
        material_id,
        nama_barang,
        unit_type,
        usage_per_bouquet,
        lead_time,
        wastage_rate,
      })
      .eq("material_id", id)
      .select()
      .single();

    if (error || !data) throw error;
    res.json({ success: true, message: "Material berhasil diupdate", data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== DELETE - Hapus material (Super Admin only)
MaterialRoute.delete("/:id", cekAutentikasi, async (req, res) => {
  try {
    if (req.user.roles !== "super-admin") {
      return res.status(403).json({
        success: false,
        error: "Hanya super-admin yang bisa menghapus material",
      });
    }

    const { id } = req.params;
    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("material_id", id);

    if (error) throw error;
    res.json({ success: true, message: "Material berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
