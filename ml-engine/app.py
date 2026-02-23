import os
from flask import Flask, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv
import random
from datetime import datetime

# --- SETUP ---
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

app = Flask(__name__)
CORS(app)

# Koneksi Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

# Fallback biar tidak crash
if not url: url = "https://dummy.supabase.co"
if not key: key = "dummy"

supabase: Client = create_client(url, key)

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "ML Engine Ready", "status": "Running"})

@app.route('/predict', methods=['POST'])
def run_prediction():
    try:
        print("\n>>> 1. CEK DATA LAMA...")
        
        # --- FITUR BARU: CEK DUPLIKAT ---
        # Kita intip apakah tabel churn_predictions sudah ada isinya?
        existing = supabase.table('churn_predictions').select("id").limit(1).execute()
        
        # JIKA SUDAH ADA DATA -> STOP & KIRIM WARNING
        if existing.data and len(existing.data) > 0:
            print(">>> STOP: Data sudah ada.")
            return jsonify({
                "success": False, 
                "message": "Data Prediksi SUDAH ADA. Tidak bisa duplikat. Harap hapus data lama dulu."
            }), 400

        print(">>> 2. DATA KOSONG. MEMULAI ANALISIS BARU...")
        
        # Ambil Semua Crew
        crew_res = supabase.table('crew').select("*").execute()
        
        if not crew_res.data:
            return jsonify({"success": False, "message": "Data Crew Kosong"}), 400

        results = []
        now = datetime.now().isoformat()

        # Loop simulasi nilai risiko
        for row in crew_res.data:
            score = random.randint(20, 95)
            level = 'High' if score > 70 else 'Medium' if score > 40 else 'Low'
            factors = ["Risiko AI", "Absensi"] if score > 60 else ["Aman"]
            
            results.append({
                "crew_id": row['id'], 
                "risk_score": score,
                "risk_level": level,
                "factors": factors,
                "prediction_date": now
            })

        # --- SIMPAN DATA (PAKAI INSERT, BUKAN UPSERT) ---
        # Kita pakai insert biasa. Kalau ada duplikat ID, dia akan error (sesuai keinginanmu)
        print(f">>> 3. Menyimpan {len(results)} data...")
        supabase.table('churn_predictions').insert(results).execute()

        print(">>> SELESAI.")
        return jsonify({"success": True, "message": "Analisis Berhasil Disimpan!"})

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        # Tangkap error duplikat database kalau lolos dari pengecekan awal
        if "duplicate key" in str(e) or "23505" in str(e):
             return jsonify({"success": False, "message": "GAGAL: Data Duplikat terdeteksi."}), 400
             
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)