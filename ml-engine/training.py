import pandas as pd
import numpy as np
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
import joblib

# 1. SETUP & KONEKSI DB
load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

print(">>> MEMULAI PROSES TRAINING MODEL...")

# 2. LOAD DATASET (DATA HISTORIS)
# Anggap kita mengambil data historis karyawan yang sudah resign (churn=1) dan belum (churn=0)
# Untuk demo ini, kita akan simulasi data jika tabel history belum lengkap
print("1. Loading Data...")

# Fetch data real (contoh implementasi)
crew_res = supabase.table('crew').select("*").execute()
df = pd.DataFrame(crew_res.data)

# --- SIMULASI FITUR & TARGET (UNTUK KEPERLUAN DEMO KODE) ---
# Karena data di DB mungkin masih sedikit, kita buat dummy columns untuk menunjukkan alur SMOTE
# Dalam real case, kolom ini harusnya ada di database kamu
np.random.seed(42)
if not df.empty:
    df['tenure_months'] = np.random.randint(1, 60, size=len(df))
    df['distance_km'] = np.random.uniform(1, 25, size=len(df))
    df['absent_count'] = np.random.randint(0, 5, size=len(df))
    # Target dummy: 1 (Resign), 0 (Stay)
    df['is_churn'] = np.random.randint(0, 2, size=len(df)) 
else:
    print("❌ Data Kosong. Pastikan database terisi.")
    exit()

# 3. PREPROCESSING
print("2. Preprocessing...")
X = df[['tenure_months', 'distance_km', 'absent_count']] # Fitur
y = df['is_churn'] # Target

# Handling Missing Values
X = X.fillna(0)

# Splitting Data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 4. IMPLEMENTASI SMOTE (PENTING!)
print(f"3. Balancing Data dengan SMOTE...")
print(f"   - Jumlah data awal: {y_train.value_counts().to_dict()}")

smote = SMOTE(random_state=42)
X_train_smote, y_train_smote = smote.fit_resample(X_train, y_train)

print(f"   - Jumlah data setelah SMOTE: {y_train_smote.value_counts().to_dict()}")

# 5. TRAINING MODEL
print("4. Training Logistic Regression...")
model = LogisticRegression()
model.fit(X_train_smote, y_train_smote)

# 6. EVALUASI
print("5. Evaluasi Model:")
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# 7. SIMPAN MODEL (Opsional)
# joblib.dump(model, 'churn_model.pkl')
# print(">>> Model berhasil disimpan sebagai 'churn_model.pkl'")