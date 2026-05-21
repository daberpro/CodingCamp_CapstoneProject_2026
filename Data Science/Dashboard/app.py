# ============================================
# DASHBOARD INTERAKTIF UMKM PITAKADO
# ============================================

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

# ============================================
# KONFIGURASI HALAMAN
# ============================================
st.set_page_config(
    page_title="Pitakado | Gift Analytics",
    page_icon="🎁",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================
# CUSTOM CSS 
# ============================================
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .stApp {
        background: linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%);
    }
    
    .main-header {
        background: linear-gradient(135deg, #991B1B 0%, #F70505 100%);
        border-radius: 24px;
        padding: 28px 32px;
        margin-bottom: 28px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    }
    
    .main-header h1 {
        color: white;
        font-size: 28px;
        font-weight: 700;
        margin: 0;
    }
    
    .main-header p {
        color: rgba(255,255,255,0.85);
        margin: 8px 0 0 0;
        font-size: 14px;
    }
    
    .header-badge {
        background: rgba(255,255,255,0.2);
        border-radius: 20px;
        padding: 4px 12px;
        font-size: 12px;
        display: inline-block;
        margin-right: 8px;
        color: white;
    }
    
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #F70505 0%, #450A0A 100%);
        border-right: none;
    }
    
    [data-testid="stSidebar"] .stMarkdown, 
    [data-testid="stSidebar"] .stTitle,
    [data-testid="stSidebar"] .stSubheader {
        color: white !important;
    }
    
    [data-testid="stSidebar"] .stSelectbox label {
        color: rgba(255,255,255,0.8) !important;
    }
    
    .sidebar-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        margin: 20px 0;
    }
    
    .stTabs [data-baseweb="tab-list"] {
        gap: 12px;
        background: transparent;
        padding: 8px;
    }
    
    .stTabs [data-baseweb="tab"] {
        border-radius: 40px;
        padding: 10px 24px;
        background: white;
        color: #4B5563;
        font-weight: 500;
        border: 1px solid #FEE2E2;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #F70505 0%, #991B1B 100%);
        color: white;
        border: none;
    }
    
    .custom-divider {
        margin: 24px 0;
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, #FCA5A5, transparent);
    }
    
    .stButton button {
        background: linear-gradient(135deg, #F70505 0%, #991B1B 100%);
        color: white;
        border-radius: 30px;
        border: none;
        padding: 10px 24px;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .stButton button:hover {
        transform: scale(1.02);
        box-shadow: 0 5px 15px rgba(220,38,38,0.3);
    }
    
    .sidebar-logo {
        text-align: center;
        padding: 20px 0;
    }
    
    .sidebar-logo h1 {
        font-size: 48px;
        margin: 0;
    }
    
    .sidebar-logo h3 {
        color: #FCA5A5;
        margin: 8px 0 0 0;
        font-weight: 600;
    }
    
    .sidebar-stats {
        background: rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 16px;
        margin-top: 20px;
    }
    
    .sidebar-stats p {
        margin: 0;
        font-size: 12px;
        color: rgba(255,255,255,0.7);
    }
    
    .sidebar-stats .number {
        font-size: 24px;
        font-weight: bold;
        margin: 8px 0 0 0;
        color: white;
    }
    
    [data-testid="stMetricValue"] {
        color: #F70505 !important;
    }
    
    [data-testid="stMetricLabel"] {
        color: #6B7280 !important;
    }

</style>
""", unsafe_allow_html=True)

# ============================================
# LOAD DATA
# ============================================
@st.cache_data
def load_data():
    df = pd.read_csv('data_dynamic.csv')
    df['tanggal'] = pd.to_datetime(df['tanggal'])
    df['bulan'] = df['tanggal'].dt.month
    df['nama_bulan'] = df['bulan'].map({
        1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
        5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
        9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
    })
    return df

df = load_data()

@st.cache_data
def load_bahan():
    df = pd.read_csv('bahan_baku.csv')
    df['tanggal'] = pd.to_datetime(df['tanggal'])
    return df

df_beli = load_bahan()

# ============================================
# SIDEBAR
# ============================================
with st.sidebar:
    st.markdown("""
    <div class="sidebar-logo">
        <h1 style="font-size: 48px; margin: 0;">🎁</h1>
        <h3 style="color: white; font-weight: 700; margin: 8px 0 0 0;">DASHBOARD PITAKADO</h3>
    </div> """, unsafe_allow_html=True)
    
    st.markdown('<div class="sidebar-divider"></div>', unsafe_allow_html=True)
    
    st.markdown("### 📅 Event")
    col1, col2 = st.columns([0.1, 0.9])
    with col1:
        show_event_only = st.checkbox("", value=False)
    with col2:
        st.markdown('<span style="color: white; font-weight: bold;">Hanya hari event</span>', unsafe_allow_html=True)    
    
    st.markdown("### 📆 Bulan")
    urutan_bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    bulan_tersedia = [b for b in urutan_bulan if b in df['nama_bulan'].values]
    bulan_list = ['Semua Bulan'] + bulan_tersedia
    selected_bulan = st.selectbox("", bulan_list)
    
    st.markdown("### 📅 Rentang Tanggal")
    min_date = df['tanggal'].min()
    max_date = df['tanggal'].max()
    date_range = st.date_input(
        "",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date
    )
    
    st.markdown('<div class="sidebar-divider"></div>', unsafe_allow_html=True)
    
    st.markdown(f"""
    <div class="sidebar-stats">
        <p>📊 TOTAL DATA</p>
        <div class="number">{len(df):,}</div>
    </div>
    """, unsafe_allow_html=True)
    

    min_date = df['tanggal'].min()
    max_date = df['tanggal'].max()

    st.markdown(f"""
    <div style="margin-top: 15px;">
    <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 15px;">
        <div style="color: rgba(255,255,255,0.7); font-size: 11px; margin-bottom: 5px;">📅 PERIODE</div>
        <div style="color: white; font-size: 14px; font-weight: bold;">
            {min_date.strftime('%Y')} - {max_date.strftime('%Y')}
        </div>
        <div style="color: rgba(255,255,255,0.5); font-size: 10px; margin-top: 5px;">
            {min_date.strftime('%d %b %Y')} s/d {max_date.strftime('%d %b %Y')}
        </div>
    </div>
    """, unsafe_allow_html=True)

# ============================================
# FILTER DATA 
# ============================================
filtered_df = df.copy()

if show_event_only:
    filtered_df = filtered_df[filtered_df['is_event'] == True]

if selected_bulan != 'Semua Bulan':
    filtered_df = filtered_df[filtered_df['nama_bulan'] == selected_bulan]

if len(date_range) == 2:
    start_date, end_date = date_range
    filtered_df = filtered_df[
        (filtered_df['tanggal'] >= pd.to_datetime(start_date)) & 
        (filtered_df['tanggal'] <= pd.to_datetime(end_date))
    ]

# ============================================
# HEADER
# ============================================
st.markdown(f"""
<div class="main-header">
    <h1>📊 Pitakado Business Analytics</h1>
    <p>Dashboard interaktif untuk analisis penjualan, profit, dan manajemen stok UMKM Pitakado</p>
</div>
""", unsafe_allow_html=True)

# ============================================
# KPI METRICS
# ============================================
col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    total_penjualan = filtered_df['qty'].sum()
    st.metric("📦 Total Produk Terjual", f"{total_penjualan:,} unit")

with col2:
    total_pendapatan = filtered_df['Harga_Jual'].sum()
    st.metric("💰 Total Pendapatan", f"Rp {total_pendapatan:,.0f}")

with col3:
    total_modal = filtered_df['Modal'].sum()
    st.metric("🏭 Total Modal", f"Rp {total_modal:,.0f}")

with col4:
    total_profit = filtered_df['Profit'].sum()
    st.metric("📈 Total Keuntungan", f"Rp {total_profit:,.0f}")

with col5:
    margin = (total_profit / total_pendapatan * 100) if total_pendapatan > 0 else 0
    st.metric("📊 Margin Keuntungan", f"{margin:.1f}%")

st.markdown('<hr class="custom-divider">', unsafe_allow_html=True)

# ============================================
# TABBED INTERFACE
# ============================================
tab1, tab2, tab3, tab4, tab5 = st.tabs(["📈 Tren Penjualan", "🎯 Event Analysis", "🏷️ Produk & Profit", "📦 Kategori", "📦 Prioritas Bahan Baku"])

with tab1:
    st.subheader("📈 Perkembangan Penjualan Harian")
    daily_sales = filtered_df.groupby('tanggal')['qty'].sum().reset_index()
    
    fig1 = px.area(
        daily_sales,
        x='tanggal',
        y='qty',
        title='Tren Penjualan Harian',
        labels={'tanggal': 'Tanggal', 'qty': 'Jumlah Terjual (unit)'},
        template='plotly_white'
    )
    fig1.update_traces(fill='tozeroy', line_color="#F70505", line_width=2, marker_color="#A90000")
    fig1.update_layout(height=450, hovermode='x unified')
    st.plotly_chart(fig1, use_container_width=True)

with tab2:
    col_e1, col_e2 = st.columns(2)
    
    with col_e1:
        st.subheader("🎯 Event vs Non-Event")
        event_comparison = df.groupby('is_event')['qty'].mean().reset_index()
        event_comparison['is_event'] = event_comparison['is_event'].map({True: 'Hari Event', False: 'Hari Biasa'})
        
        fig2 = px.bar(
            event_comparison,
            x='is_event',
            y='qty',
            title='Rata-rata Penjualan per Hari',
            color='is_event',
            color_discrete_map={'Hari Event': '#F70505', 'Hari Biasa': '#777777'},
            text='qty',
            template='plotly_white'
        )
        fig2.update_traces(texttemplate='%{text:.1f} unit', textposition='outside')
        fig2.update_layout(height=400)
        st.plotly_chart(fig2, use_container_width=True)
    
    with col_e2:
        st.subheader("📊 Proporsi Penjualan")
        event_dist = df.groupby('is_event')['qty'].sum().reset_index()
        event_dist['is_event'] = event_dist['is_event'].map({True: 'Hari Event', False: 'Hari Biasa'})
        
        fig2b = px.pie(
            event_dist,
            values='qty',
            names='is_event',
            title='Proporsi Penjualan',
            color_discrete_sequence=['#F70505', '#777777'],
            hole=0.4
        )
        fig2b.update_traces(textposition='inside', textinfo='percent+label')
        fig2b.update_layout(height=400)
        st.plotly_chart(fig2b, use_container_width=True)

with tab3:
    col_p1, col_p2 = st.columns(2)
    
    with col_p1:
        st.subheader("🏷️ Top 5 Produk Terlaris")
        top5_products = filtered_df.groupby('produk')['qty'].sum().sort_values(ascending=False).head(5).reset_index()
        
        fig3 = px.bar(
            top5_products,
            x='qty',
            y='produk',
            orientation='h',
            title='Produk Paling Laris',
            color='qty',
            color_continuous_scale='Reds',
            text='qty',
            template='plotly_white'
        )
        fig3.update_traces(texttemplate='%{text} unit', textposition='outside')
        fig3.update_layout(height=400)
        st.plotly_chart(fig3, use_container_width=True)
    
    with col_p2:
        st.subheader("💰 Top 5 Profit Tertinggi")
        top5_profit = filtered_df.groupby('produk')['Profit'].sum().sort_values(ascending=False).head(5).reset_index()
        
        fig3b = px.bar(
            top5_profit,
            x='Profit',
            y='produk',
            orientation='h',
            title='Produk Paling Menguntungkan',
            color='Profit',
            color_continuous_scale='Reds',
            text='Profit',
            template='plotly_white'
        )
        fig3b.update_traces(texttemplate='Rp %{text:,.0f}', textposition='outside')
        fig3b.update_layout(height=400)
        st.plotly_chart(fig3b, use_container_width=True)

with tab4:
    st.subheader("📦 Komposisi Profit per Kategori")
    
    filtered_df['kategori'] = filtered_df['produk'].apply(
        lambda x: 'Bouquet' if 'bouquet' in str(x).lower() 
        else ('Frame' if 'frame' in str(x).lower() else 'Lainnya')
    )
    
    profit_kategori = filtered_df.groupby('kategori')['Profit'].sum().reset_index()
    
    col_k1, col_k2 = st.columns(2)
    
    with col_k1:
        fig4 = px.pie(
            profit_kategori,
            values='Profit',
            names='kategori',
            title='Persentase Profit per Kategori',
            color_discrete_sequence=['#F70505', "#F3B5B5", "#777777"],
            hole=0.3
        )
        fig4.update_traces(textposition='inside', textinfo='percent+label')
        fig4.update_layout(height=400)
        st.plotly_chart(fig4, use_container_width=True)
    
    with col_k2:
        st.subheader("📊 Profit per Bulan")
        monthly_profit = filtered_df.groupby('bulan')['Profit'].sum().reset_index()
        monthly_profit['nama_bulan'] = monthly_profit['bulan'].map({
            1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 6: 'Jun',
            7: 'Jul', 8: 'Agu', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des'
        })
        
        fig4b = px.bar(
            monthly_profit,
            x='nama_bulan',
            y='Profit',
            title='Total Profit per Bulan',
            color='Profit',
            color_continuous_scale='Reds',
            text='Profit',
            template='plotly_white'
        )
        fig4b.update_traces(texttemplate='Rp %{text:,.0f}', textposition='outside')
        fig4b.update_layout(height=400)
        st.plotly_chart(fig4b, use_container_width=True)

st.markdown('<hr class="custom-divider">', unsafe_allow_html=True)

with tab5:
    st.subheader("📦 Prioritas Bahan Baku")
    
    try:
        biaya_bahan = df_beli.groupby('nama_barang')['total_harga'].sum().sort_values(ascending=False).head(5)
        frekuensi_bahan = df_beli.groupby('nama_barang')['qty'].count().sort_values(ascending=False).head(5)
        
        col_b1, col_b2 = st.columns(2)
        
        with col_b1:
            fig_b1 = px.bar(
                x=biaya_bahan.values,
                y=biaya_bahan.index,
                orientation='h',
                title='Top 5 Bahan Baku dengan Biaya Tertinggi',
                labels={'x': 'Total Biaya (Rp)', 'y': ''},
                color=biaya_bahan.values,
                color_continuous_scale='Reds',
                template='plotly_white'
            )
            fig_b1.update_layout(height=400)
            st.plotly_chart(fig_b1, use_container_width=True)
        
        with col_b2:
            fig_b2 = px.bar(
                x=frekuensi_bahan.values,
                y=frekuensi_bahan.index,
                orientation='h',
                title='Top 5 Bahan Baku Paling Sering Dibeli',
                labels={'x': 'Frekuensi (kali)', 'y': ''},
                color=frekuensi_bahan.values,
                color_continuous_scale='Oranges',
                template='plotly_white'
            )
            fig_b2.update_layout(height=400)
            st.plotly_chart(fig_b2, use_container_width=True)

        st.markdown('<hr class="custom-divider">', unsafe_allow_html=True)
        st.subheader("📋 Detail Data Pembelian Bahan Baku")
        
        with st.expander("📌 Klik untuk melihat tabel data bahan baku lengkap"):
            st.dataframe(
                df_beli[['tanggal', 'nama_barang', 'qty', 'harga_satuan', 'total_harga']],
                use_container_width=True,
                height=400
            )
            st.caption(f"Menampilkan semua {len(df_beli)} data pembelian bahan baku")
    
    except NameError:
        st.warning("⚠️ Data bahan baku (df_beli) tidak tersedia. Silakan upload file bahan_baku.csv")
    
    except Exception as err:
        st.error(f"❌ Terjadi error: {err}")

st.markdown('<hr class="custom-divider">', unsafe_allow_html=True)

# ============================================
# DATA TABLE
# ============================================
with st.expander("📋 Lihat Detail Data Penjualan"):
    st.dataframe(
        filtered_df[['tanggal', 'produk', 'qty', 'Harga_Jual', 'Modal', 'Profit', 'is_event']].head(100),
        use_container_width=True,
        height=400
    )
    st.caption(f"Menampilkan 100 baris dari total {len(filtered_df)} data")

st.markdown('<hr class="custom-divider">', unsafe_allow_html=True)

# ============================================
# KESIMPULAN & REKOMENDASI (DINAMIS)
# ============================================

# PERTANYAAN 1
non_event_qty = df[df['is_event'] == False]['qty'].mean()
event_qty = df[df['is_event'] == True]['qty'].mean()
peningkatan = ((event_qty - non_event_qty) / non_event_qty) * 100 if non_event_qty > 0 else 0

# PERTANYAAN 2
df_event = df[df['is_event'] == True].copy()
df_event['kategori'] = df_event['produk'].apply(
    lambda x: 'Bouquet' if 'bouquet' in str(x).lower() 
    else ('Frame' if 'frame' in str(x).lower() else 'Lainnya')
)
profit_bouquet = df_event[df_event['kategori'] == 'Bouquet']['Profit'].sum()
profit_frame = df_event[df_event['kategori'] == 'Frame']['Profit'].sum()
selisih_profit = abs(profit_bouquet - profit_frame)

# PERTANYAAN 3 - Puncak Penjualan Bulanan (Dinamis)
df['bulan'] = df['tanggal'].dt.month
bulan_penjualan = df.groupby('bulan')['qty'].sum()

bulan_tertinggi = bulan_penjualan.idxmax()
qty_tertinggi = bulan_penjualan.max()
bulan_terendah = bulan_penjualan.idxmin()
qty_terendah = bulan_penjualan.min()

nama_bulan = {
    1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni',
    7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
}
bulan_tertinggi_nama = nama_bulan.get(bulan_tertinggi, bulan_tertinggi)
bulan_terendah_nama = nama_bulan.get(bulan_terendah, bulan_terendah)

# PERTANYAAN 4 - Prioritas Bahan Baku (Dinamis)
try:
    if df_beli is not None and len(df_beli) > 0:
        total_biaya = df_beli['total_harga'].sum()
        biaya_tertinggi = df_beli.groupby('nama_barang')['total_harga'].sum().sort_values(ascending=False)
        bahan_biaya_tertinggi = biaya_tertinggi.index[0]
        nilai_biaya_tertinggi = biaya_tertinggi.values[0]
        persen_biaya = (nilai_biaya_tertinggi / total_biaya) * 100
        
        frekuensi_tertinggi = df_beli.groupby('nama_barang')['qty'].count().sort_values(ascending=False)
        bahan_frekuensi_tertinggi = frekuensi_tertinggi.index[0]
        nilai_frekuensi_tertinggi = frekuensi_tertinggi.values[0]
        
        q4_tersedia = True
    else:
        q4_tersedia = False
except Exception:
    q4_tersedia = False

# TAMPILAN KESIMPULAN
st.subheader("💡 Kesimpulan & Rekomendasi")

with st.expander("📌 Klik untuk melihat kesimpulan lengkap"):
    st.markdown(f"""
    **📊 Pertanyaan 1 - Dampak Event terhadap Penjualan**
    - Rata-rata penjualan hari biasa: {non_event_qty:.1f} unit
    - Rata-rata penjualan hari event: {event_qty:.1f} unit
    - Peningkatan: {peningkatan:.1f}%
    - **Rekomendasi:** Tingkatkan stok H-7 sebelum event, siapkan tenaga tambahan
    
    ---
    
    **🎯 Pertanyaan 2 - Profit Bouquet vs Frame**
    - Profit Bouquet: Rp {profit_bouquet:,.0f}
    - Profit Frame: Rp {profit_frame:,.0f}
    - Selisih: Rp {selisih_profit:,.0f}
    - **Rekomendasi:** Prioritaskan produksi {'Bouquet' if profit_bouquet > profit_frame else 'Frame'}
    
    ---
    
    **📆 Pertanyaan 3 - Puncak Penjualan Bulanan**
    - Puncak penjualan tertinggi: {bulan_tertinggi_nama} ({int(qty_tertinggi)} unit)
    - Puncak penjualan terendah: {bulan_terendah_nama} ({int(qty_terendah)} unit)
    - Selisih: {int(qty_tertinggi - qty_terendah)} unit
    - **Rekomendasi:** Persiapan stok 2 minggu sebelum bulan {bulan_tertinggi_nama}
    
    ---

    **📦 Pertanyaan 4 - Prioritas Bahan Baku**
    - Total biaya keseluruhan: Rp {total_biaya:,.0f}
    - Bahan baku dengan biaya tertinggi: {bahan_biaya_tertinggi} (Rp {nilai_biaya_tertinggi:,.0f} / {persen_biaya:.1f}%)
    - Bahan baku paling sering dibeli: {bahan_frekuensi_tertinggi} ({nilai_frekuensi_tertinggi} kali)
    - **Rekomendasi:** Beli grosir untuk {bahan_biaya_tertinggi}, cari supplier alternatif
        """)

st.markdown('<hr class="custom-divider">', unsafe_allow_html=True)

# ============================================
# FOOTER
# ============================================
st.markdown("""
<div style="text-align: center; padding: 20px 0 10px 0;">
    <p style="color: #9CA3AF; font-size: 12px;">
        Dashboard Capstone Project Pitakado | Data Science - Wida Monica Putri & Jacky Sakti Pratama
    </p>
    <p style="color: #CBD5E1; font-size: 11px;">
        © 2026 Pitakado Analytics
    </p>
</div>
""", unsafe_allow_html=True)