import bcrypt from 'bcrypt';
import readline from 'readline';

const saltRounds = 10;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const buatHash = async (password) => {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("\n--------------------------------------------------");
    console.log("HASIL HASH UNTUK DATABASE:");
    console.log(hash);
    console.log("--------------------------------------------------");
    console.log("Gunakan string di atas untuk kolom password di Supabase.");
  } catch (err) {
    console.error("Gagal melakukan hashing:", err);
  } finally {
    rl.close();
  }
};

// Menjalankan prompt di terminal
rl.question('Masukkan password yang ingin di-hash: ', (answer) => {
  if (answer.trim() === "") {
    console.log("Password tidak boleh kosong!");
    rl.close();
  } else {
    buatHash(answer);
  }
});