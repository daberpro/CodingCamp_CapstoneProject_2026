
## 📊 **Sales Forecasting & Business Intelligence Platform**

### 🎯 **Deskripsi Project**

**CodingCamp Capstone Project 2026** adalah aplikasi full-stack terintegrasi yang menggabungkan **Machine Learning**, **Data Science**, dan **Web Development** untuk menghadirkan solusi forecasting penjualan dan business intelligence yang komprehensif.

Proyek ini dirancang untuk membantu bisnis mengoptimalkan manajemen inventory dan prediksi penjualan menggunakan teknologi AI terkini, dilengkapi dengan platform web modern untuk visualisasi data dan analisis mendalam.

---

### 🛠️ **Tech Stack**

**Backend:**
- **Node.js + Express.js** - REST API server dengan autentikasi berbasis session
- **PostgreSQL + Supabase** - Database management dan cloud infrastructure
- **Passport.js** - Multi-auth support (Local & Google OAuth)
- **Security:** CSRF protection, bcrypt password hashing, CORS configuration

**Frontend:**
- **Svelte** - Modern, reactive UI framework
- **Interactive Dashboard** - Real-time data visualization

**AI/ML Component:**
- **Deep Learning (TensorFlow/Keras)** - Seq2Seq model untuk sales forecasting
- **Data Processing** - Normalization, time-series analysis
- **TensorBoard Logs** - Model training visualization

**Data Science:**
- **Jupyter Notebooks** - Exploratory data analysis & modeling
- **Pandas/NumPy** - Data manipulation dan statistical analysis
- **Dataset Processing** - CSV data normalization & preprocessing

---

### 📁 **Arsitektur Project**

```
├── AI/                          # Machine Learning Models
│   ├── Capstone_Project_FINALLL.ipynb  # Main ML pipeline
│   ├── seq2seq_sales_forecast.keras    # Trained model
│   └── [Data CSV & Training Logs]
│
├── Data Science/                # Data Analysis & EDA
│   ├── Notebook_Capstone_Project_Data_Analyst.ipynb
│   ├── Dashboard/               # Visualization assets
│   └── Dataset/                 # Raw & processed data
│
├── Backend/                     # Node.js REST API
│   ├── index.js                # Express server setup
│   ├── controller/             # Route handlers
│   ├── middleware/             # Auth & CSRF protection
│   └── API.rest               # Endpoint documentation
│
└── Frontend/                    # Svelte Web Application
    └── [Interactive UI Components]
```

---

### ✨ **Key Features**

✅ **AI-Powered Sales Forecasting** - Prediksi penjualan akurat menggunakan Seq2Seq deep learning model  
✅ **Real-time Dashboard** - Visualisasi data penjualan dan analytics interaktif  
✅ **Multi-User System** - Authentication dengan role-based access control  
✅ **Data Management** - CRUD operations untuk materials, products, dan sales data  
✅ **Security First** - CSRF protection, encrypted passwords, secure session management  
✅ **Scalable Architecture** - Backend API ready untuk production deployment  
