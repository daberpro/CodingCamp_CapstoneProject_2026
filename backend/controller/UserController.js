import express from "express";
import { supabase } from '../connection.js';
import bcrypt from "bcrypt";

export const UserRoute = express.Router();

UserRoute.get("/",(req,res)=>{
    res.json(req.user || {});
});

UserRoute.get("/all", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Sesi tidak valid, harap login kembali." });
    }

    if (req.user.roles === 'kasir') {
        return res.status(403).json({ 
            error: "Akses ditolak. Kasir tidak diizinkan untuk melihat daftar pengguna." 
        });
    }

    try {
        const { data, error } = await supabase
            .from('user')
            .select('id, username, email, roles, avatar_url, created_at');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

UserRoute.post("/add", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Sesi tidak valid, harap login kembali." });
    }

    const loggedInUserRole = req.user.roles;

    if (loggedInUserRole === 'kasir') {
        return res.status(403).json({ 
            error: "Akses ditolak. Kasir tidak memiliki izin untuk menambahkan pengguna baru." 
        });
    }

    const { username, email, password, roles, avatar_url } = req.body;

    if (roles === 'super-admin' && loggedInUserRole !== 'super-admin') {
        return res.status(403).json({ 
            error: "Tindakan ditolak. Hanya Super Admin yang dapat membuat akun dengan tingkatan Super Admin." 
        });
    }

    try {
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const { data, error } = await supabase
            .from('user')
            .insert([{ 
                username, 
                email, 
                password: hashedPassword, 
                roles: roles || 'kasir',
                avatar_url 
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ message: "User berhasil ditambahkan", data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

UserRoute.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { username, email, password, avatar_url, roles } = req.body; 

    if (!req.user) {
        return res.status(401).json({ error: "Sesi tidak valid, harap login kembali." });
    }

    const loggedInUserId = String(req.user.id);
    const loggedInUserRole = req.user.roles;
    const targetUserId = String(id);

    if (loggedInUserRole !== 'super-admin' && loggedInUserId !== targetUserId) {
        return res.status(403).json({ 
            error: "Akses ditolak. Anda hanya diizinkan untuk mengubah data akun Anda sendiri." 
        });
    }

    try {
        const { data: existingUser, error: fetchError } = await supabase
            .from('user')
            .select('password')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existingUser) {
            return res.status(404).json({ error: "User dengan ID tersebut tidak ditemukan." });
        }

        let updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

        if (roles) {
            if (loggedInUserRole === 'super-admin') {
                if (loggedInUserId === targetUserId) {
                    return res.status(400).json({
                        error: "Tindakan ditolak. Super Admin tidak diizinkan mengubah rolenya sendiri untuk mencegah hilangnya akses sistem."
                    });
                } else {
                    updateData.roles = roles;
                }
            }
            
        }

        if (password) {
            const isSelfUpdate = (loggedInUserId === targetUserId);
            const isGoogleSession = req.user.provider === 'google';

            if (isSelfUpdate && isGoogleSession) {
                return res.status(403).json({ 
                    error: "Akun yang terdaftar melalui Google tidak diizinkan untuk mengubah/menambahkan password." 
                });
            }
            
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "Tidak ada data yang diberikan untuk diperbarui." });
        }

        const { data, error } = await supabase
            .from('user')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: "User berhasil diperbarui", data: data[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

UserRoute.delete("/:id", async (req, res) => {
    const { id } = req.params;

    if (!req.user) {
        return res.status(401).json({ error: "Sesi tidak valid, harap login kembali." });
    }

    const loggedInUserId = String(req.user.id);
    const loggedInUserRole = req.user.roles;
    const targetUserId = String(id);

    try {
        const { data: targetUser, error: fetchError } = await supabase
            .from('user')
            .select('roles')
            .eq('id', targetUserId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!targetUser) {
            return res.status(404).json({ error: "User dengan ID tersebut tidak ditemukan." });
        }

        const targetUserRole = targetUser.roles;

        if (loggedInUserId === targetUserId) {
            return res.status(403).json({ 
                error: "Tindakan ditolak. Anda tidak dapat menghapus akun Anda sendiri." 
            });
        }

        if (loggedInUserRole === 'kasir') {
            return res.status(403).json({ 
                error: "Akses ditolak. Kasir tidak memiliki izin untuk menghapus data pengguna." 
            });
        } else if (loggedInUserRole === 'admin') {
            if (targetUserRole !== 'kasir') {
                return res.status(403).json({ 
                    error: `Akses ditolak. Admin tidak diizinkan menghapus akun dengan role ${targetUserRole}.` 
                });
            }
        } 
        
        const { error: deleteError } = await supabase
            .from('user')
            .delete()
            .eq('id', targetUserId);

        if (deleteError) throw deleteError;
        
        res.json({ message: `User dengan ID ${id} berhasil dihapus.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});