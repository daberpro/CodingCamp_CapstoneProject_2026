import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get('/api/materials', async (req, res) => {
  const { data, error } = await supabase.from('materials').select('*');
  if (error) {
    return res.status(400).json({error: error.message});
  }
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port: ${PORT}`);
})