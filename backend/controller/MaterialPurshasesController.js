import express from "express";
import { supabase } from "../connection.js";
import { cekAutentikasi } from "../middleware/AuthMiddleware.js";

export const MaterialPurshasesRoute = express.Router();

// ===== POST - Menambahkan Material Purchases
MaterialPurshasesRoute.post("/", cekAutentikasi, async (req, res) => {
  try {
    // Ceck Role
    if (req.user.status === "kasir") {
      return res.status(403).json({
        success: false,
        error: "Hanya admin yang bisa menambah material purchases",
      });
    }

    const { tanggal, material_id, qty, harga_satuan } = req.body;

    // Validasi input
    if (!tanggal || !material_id || !qty || !harga_satuan) {
      return res.status(400).json({
        success: false,
        error: "Semua field (tanggal, material_id, qty, harga_satuan) harus diisi",
      });
    }

    // Validasi Type Data
    if (qty <= 0 || harga_satuan <= 0) {
      return res.status(400).json({
        success: false,
        error: "qty dan harga_satuan harus lebih besar dari 0",
      });
    }

    // Cek apakah material_id valid
    const { data: materialExists, error: materialError } = await supabase
      .from("materials")
      .select("material_id, current_stock")
      .eq("material_id", material_id)
      .single();

    if (materialError || !materialExists) {
      return res.status(400).json({
        success: false,
        error: "Material tidak ditemukan",
      });
    }

    const total_harga = qty * harga_satuan;

    const { data: Purchasesdata, error: PurchasesError } = await supabase.from("material_purchases").insert([
      {
        tanggal,
        material_id,
        qty,
        harga_satuan,
        total_harga,
        created_at: new Date(),
      },
    ]).select().single();

    if (PurchasesError) throw PurchasesError;

    // Update current_stock di tabel materials
    const { data: updateData, error: updateError } = await supabase
      .from("materials")
      .update({
        current_stock: materialExists.current_stock + qty,
      })
      .eq("material_id", material_id)
      .select()
      .single();
    
    if (updateError) {
      // Jika update stock gagal, rollback pembelian
      await supabase
        .from("material_purchases")
        .delete()
        .eq("id", Purchasesdata.id);

      throw updateError;
    }
    
    res.status(201).json({
      success: true,
      message: "Pembelian material ditambahkan",
      data: {
        porchase: Purchasesdata,
        updated_material: updateData,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET - List semua material purchases
MaterialPurshasesRoute.get("/", cekAutentikasi, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("material_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
})

// ===== GET - Detail material purchase by ID
MaterialPurshasesRoute.get("/:id", cekAutentikasi, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("material_purchases")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Data Pembelian Material tidak ditemukan"
      });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== UPDATE - Update material purchase (Admin only)
MaterialPurshasesRoute.put("/:id", cekAutentikasi, async (req, res) => {
  try {
    // Check Role
    if (req.user.roles === "kasir") {
      return res.status(403).json({
        success: false,
        error: "Hanya admin yang bisa mengupdate material purchases",
      });
    }

    const { id } = req.params;
    const { tanggal, material_id, qty, harga_satuan } = req.body;

    // Validasi input
    if (!tanggal || !material_id || !qty || !harga_satuan) {
      return res.status(400).json({
        success: false,
        error: "Semua field (tanggal, material_id, qty, harga_satuan) harus diisi",
      });
    }

    // Validasi Type Data
    if (qty <= 0 || harga_satuan <= 0) {
      return res.status(400).json({
        success: false,
        error: "qty dan harga_satuan harus lebih besar dari 0",
      });
    }

    // Cek apakah data pembelian material exists
    const { data: purchaseExists, error: purchaseError } = await supabase
      .from("material_purchases")
      .select("*")
      .eq("id", id)
      .single();

    if (purchaseError || !purchaseExists) {
      return res.status(404).json({
        success: false,
        error: "Data Pembelian Material tidak ditemukan"
      });
    }

    // Cek apakah material_id valid
    const { data: materialExists, error: materialError } = await supabase
      .from("materials")
      .select("material_id, current_stock")
      .eq("material_id", material_id)
      .single();

    if (materialError || !materialExists) {
      return res.status(404).json({
        success: false,
        error: "Material tidak ditemukan"
      });
    }

    const qty_lama = purchaseExists.qty;
    const qty_selisih = qty - qty_lama;
    const stock_baru = materialExists.current_stock + qty_selisih;

    if (stock_baru < 0) {
      return res.status(400).json({
        success: false,
        error: "Stok material tidak cukup untuk update pembelian ini"
      });
    }

    const total_harga = qty * harga_satuan;

    const { data: updatedPurchase, error: updateError } = await supabase
      .from("material_purchases")
      .update({
        tanggal,
        material_id,
        qty,
        harga_satuan,
        total_harga
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update current_stock di tabel materials
    const { data: updatedMaterial, error: updateMaterialError } = await supabase
      .from("materials")
      .update({
        current_stock: stock_baru,
      })
      .eq("material_id", material_id)
      .select()
      .single();

    if (updateMaterialError) {
      await supabase
        .from("material_purchases")
        .update({
          tanggal: purchaseExists.tanggal,
          material_id: purchaseExists.material_id,
          qty: purchaseExists.qty,
          harga_satuan: purchaseExists.harga_satuan,
          total_harga: purchaseExists.total_harga
        })
        .eq("id", id);
      
      throw updateMaterialError;
    }

    res.json({ 
      success: true,
      message: "Data Pembelian Material berhasil diupdate",
      data: {
        purchase: updatedPurchase,
        updated_material: updatedMaterial,
        adjustment: {
          qty_lama,
          qty_baru: qty,
          qty_selisih,
          stock_lama: materialExists.current_stock,
          stock_baru
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== DELETE - Hapus material purchase (Super Admin only)
MaterialPurshasesRoute.delete("/:id", cekAutentikasi, async (req, res) => {
  try {
    // Check Role
    if (req.user.roles !== "super-admin") {
      return res.status(403).json({
        success: false,
        error: "Hanya super-admin yang bisa menghapus material purchases",
      })
    }

    const { id } = req.params;

    // Ambil data material_purchase yang akan dihapus
    const { data: purchaseData, error: purchaseError } = await supabase
      .from("material_purchases")
      .select("material_id, qty")
      .eq("id", id)
      .single();

    if (purchaseError || !purchaseData) {
      return res.status(404).json({
        success: false,
        error: "Data Pembelian Material tidak ditemukan"
      });
    }

    // Mengubah current_stock di tabel materials sebelum menghapus pembelian
    const { data: materialData, error: materialError } = await supabase
      .from("materials")
      .select("current_stock")
      .eq("material_id", purchaseData.material_id)
      .single();

    if (materialError) throw materialError;

    const stock_baru = materialData.current_stock - purchaseData.qty;

    // Stock tidak boleh negatif
    if (stock_baru < 0) {
      return res.status(400).json({
        success: false,
        error: "Stok material tidak cukup untuk menghapus pembelian ini"
      });
    }

    // Update stock material
    const { error: updateStockError } = await supabase
      .from("materials")
      .update({
        current_stock: stock_baru,
      })
      .eq("material_id", purchaseData.material_id);

    if (updateStockError) throw updateStockError;

    // Hapus data pembelian material
    const { error: deleteError } = await supabase
      .from("material_purchases")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: "Data Pembelian Material berhasil dihapus",
      data: {
        deleted_qty: purchaseData.qty,
        material_id: purchaseData.material_id,
        stock_baru: stock_baru
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
})