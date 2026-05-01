import express from "express";

export const cekAutentikasi = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    
    return res.status(401).json({ 
        error: "Akses ditolak. Silakan login terlebih dahulu." 
    });
};