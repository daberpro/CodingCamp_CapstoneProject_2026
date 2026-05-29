import express from 'express';
import google_login from 'passport-google-oauth20';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { Strategy as LocalStrategy } from 'passport-local';
import { createClient } from '@supabase/supabase-js';

export const LoginRoute = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

passport.use(new google_login.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const username = profile.displayName;
      const avatar_url = profile.photos[0].value;

      const { data: existingUser, error: searchError } = await supabase
        .from('user')
        .select('id, username, email, roles, avatar_url, status_verified')
        .eq('email', email)
        .single();

      if (existingUser) {
        return done(null, existingUser);
      }

      const { data: newUser, error: insertError } = await supabase
        .from('user')
        .insert([{ 
            email: email,
            username: username,
            avatar_url: avatar_url,
            roles: 'kasir',
            status_verified: 'not-verified'
        }])
        .select()
        .single();

      if (insertError) {
        console.error("Gagal insert ke Supabase:", insertError.message);
        throw insertError;
      }

      return done(null, newUser);

    } catch (error) {
      console.error("Error Auth Google:", error);
      return done(error, null);
    }
  }
));

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const { data: user, error } = await supabase
        .from('user')
        .select('id, username, password, email, roles, avatar_url, status_verified')
        .eq('email', email)
        .single();

      if (error || !user) {
        return done(null, false, { message: 'Email tidak terdaftar.' });
      }

      const match = await bcrypt.compare(password, user.password);
      
      if (!match) {
        return done(null, false, { message: 'Password salah.' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data: user, error } = await supabase
      .from('user')
      .select('id, username, email, roles, avatar_url, status_verified')
      .eq('id', id)
      .single();
      
    done(error, user);
  } catch (err) {
    done(err, null);
  }
});

LoginRoute.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

LoginRoute.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login/google' }),
  function(req, res) {
    res.redirect('/');
  }
);

LoginRoute.post('/email', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message });

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({ message: "Login berhasil", user: user });
    });
  })(req, res, next);
});
