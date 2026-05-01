import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from 'passport';
import pgSession from 'connect-pg-simple';
import pg from 'pg';
import { csrfSync } from 'csrf-sync';
import { supabase } from './connection.js';

// ======= Middleware & Local Imports
import { cekAutentikasi } from './middleware/AuthMiddleware.js';
import { LoginRoute } from './controller/LoginController.js';
import { UserRoute } from './controller/UserController.js';

// ======= Initialization
const app = express();
const PORT = process.env.PORT || 5000;

const dbPool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false } 
});

const PgSessionStore = pgSession(session);

// ======= Global Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000', // Direkomendasikan menggunakan env variable untuk URL
  credentials: true
}));

app.use(express.json());

// ======= Session Setup
app.use(session({
  store: new PgSessionStore({
    pool: dbPool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'rahasiaa_bangett',
  resave: false,
  saveUninitialized: false, // Pertahankan false
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 Hari
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ======= CSRF Protection Setup
const { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: (req) => req.headers["x-csrf-token"], 
});

// Endpoint Token CSRF (Harus sebelum middleware proteksi)
app.get("/api/v1/xxdf", (req, res) => {
  res.json({ csrfToken: generateToken(req) });
});

// Middleware Proteksi CSRF (Berlaku untuk semua endpoint di bawah ini)
app.use(csrfSynchronisedProtection);

// ======= API Endpoints
app.use("/auth", LoginRoute);
app.use("/api/v1/user", cekAutentikasi, UserRoute);

app.get("/api/v1/materials", cekAutentikasi, async (req, res) => {
  try {
    const { data, error } = await supabase.from('materials').select('*');
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data materials.' });
  }
});

// ======= Logout / Frontend Endpoints
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

// ======= Error Handling Middleware
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Sesi tidak valid atau token ditolak.' });
  }
  
  // Catch-all error handler
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

// ======= Start Server
app.listen(PORT, () => {
  console.log(`Server berjalan di port: ${PORT}`);
});