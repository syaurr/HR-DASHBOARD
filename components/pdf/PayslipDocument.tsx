import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9, lineHeight: 1.5 },
  header: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#111', paddingBottom: 10, marginBottom: 15, alignItems: 'center' },
  logo: { width: 50, height: 50, marginRight: 15 },
  companyInfo: { flexDirection: 'column' },
  companyName: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  companyAddress: { fontSize: 8, color: '#555' },
  titleContainer: { marginTop: 5, marginBottom: 15, alignItems: 'center' },
  reportTitle: { fontSize: 12, fontWeight: 'bold', textDecoration: 'underline' },
  periodText: { fontSize: 10, marginTop: 2 },
  
  // Info Karyawan Grid
  employeeInfo: { flexDirection: 'row', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 5 },
  colLeft: { width: '60%' },
  colRight: { width: '40%' },
  rowInfo: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 80, fontWeight: 'bold', color: '#444' },
  val: { flex: 1 },

  // Tabel Rincian
  sectionHeader: { fontSize: 10, fontWeight: 'bold', backgroundColor: '#f3f4f6', padding: 4, marginTop: 10, marginBottom: 5 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#eee', paddingVertical: 3 },
  rowTotal: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#000', paddingVertical: 6, marginTop: 5 },
  colLabel: { flex: 3 },
  colMoney: { flex: 1, textAlign: 'right' },
  
  // Footer
  footer: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' },
  signBlock: { alignItems: 'center', width: 120 },
  signLine: { marginTop: 40, borderBottomWidth: 1, borderBottomColor: '#000', width: '100%' },
  notes: { marginTop: 10, fontSize: 8, fontStyle: 'italic', color: '#666' }
});

const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

// Tipe Data Sesuai Database Baru
type PayslipProps = {
  data: {
    full_name: string;
    role?: string;
    outlet_name: string;
    period_name: string;
    bank_name: string;
    account_number: string;
    
    // Angka-angka
    base_salary: number;
    total_percentage_income: number;
    meal_allowance: number;
    other_bonus: number;
    allowance_other: number; // Tunjangan jabatan/lainnya
    
    deduction_sia: number; // Sakit Izin Alpa
    deduction_kasbon: number;
    remaining_loan: number;
    
    total_income: number;
    net_salary: number;
    notes?: string;
  }
};

export const PayslipDocument = ({ data }: PayslipProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Image style={styles.logo} src="/logo.png" />
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>PT. ALTRI SEJAHTERA INDONESIA</Text>
          <Text style={styles.companyAddress}>Jl. Contoh Alamat No. 123, Bandung</Text>
        </View>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.reportTitle}>SLIP GAJI (PAYSLIP)</Text>
        <Text style={styles.periodText}>{data.period_name}</Text>
      </View>

      {/* INFO KARYAWAN */}
      <View style={styles.employeeInfo}>
        <View style={styles.colLeft}>
          <View style={styles.rowInfo}><Text style={styles.label}>Nama</Text><Text style={styles.val}>: {data.full_name}</Text></View>
          <View style={styles.rowInfo}><Text style={styles.label}>Jabatan</Text><Text style={styles.val}>: {data.role || 'Crew'}</Text></View>
          <View style={styles.rowInfo}><Text style={styles.label}>Outlet</Text><Text style={styles.val}>: {data.outlet_name}</Text></View>
        </View>
        <View style={styles.colRight}>
            <View style={styles.rowInfo}><Text style={styles.label}>Bank</Text><Text style={styles.val}>: {data.bank_name}</Text></View>
            <View style={styles.rowInfo}><Text style={styles.label}>No. Rek</Text><Text style={styles.val}>: {data.account_number}</Text></View>
        </View>
      </View>

      {/* A. PENERIMAAN */}
      <Text style={styles.sectionHeader}>A. PENERIMAAN (INCOME)</Text>
      <View style={styles.row}>
        <Text style={styles.colLabel}>Gaji Pokok</Text>
        <Text style={styles.colMoney}>{formatRupiah(data.base_salary)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.colLabel}>Uang Makan</Text>
        <Text style={styles.colMoney}>{formatRupiah(data.meal_allowance)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.colLabel}>Total Persenan (Omzet)</Text>
        <Text style={styles.colMoney}>{formatRupiah(data.total_percentage_income)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.colLabel}>Bonus / Insentif</Text>
        <Text style={styles.colMoney}>{formatRupiah(data.other_bonus)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.colLabel}>Tunjangan Lainnya</Text>
        <Text style={styles.colMoney}>{formatRupiah(data.allowance_other)}</Text>
      </View>
      <View style={styles.rowTotal}>
        <Text style={[styles.colLabel, {fontWeight:'bold'}]}>Total Pendapatan Kotor</Text>
        <Text style={[styles.colMoney, {fontWeight:'bold'}]}>{formatRupiah(data.total_income)}</Text>
      </View>

      {/* B. POTONGAN */}
      <Text style={styles.sectionHeader}>B. POTONGAN (DEDUCTION)</Text>
      <View style={styles.row}>
        <Text style={styles.colLabel}>Potongan Absensi (Sakit/Izin/Alpa/Sabtu)</Text>
        <Text style={[styles.colMoney, {color: '#b91c1c'}]}>({formatRupiah(data.deduction_sia)})</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.colLabel}>Kasbon / Pinjaman</Text>
        <Text style={[styles.colMoney, {color: '#b91c1c'}]}>({formatRupiah(data.deduction_kasbon)})</Text>
      </View>
      <View style={styles.rowTotal}>
        <Text style={[styles.colLabel, {fontWeight:'bold'}]}>Total Potongan</Text>
        <Text style={[styles.colMoney, {fontWeight:'bold', color: '#b91c1c'}]}>
            ({formatRupiah(data.deduction_sia + data.deduction_kasbon)})
        </Text>
      </View>

      {/* C. TOTAL */}
      <View style={{ marginTop: 15, padding: 10, borderWidth: 2, borderColor: '#000', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 3 }}>
             <Text style={{ fontSize: 11, fontWeight: 'bold' }}>TOTAL DITERIMA (TAKE HOME PAY)</Text>
             {data.remaining_loan > 0 && (
                <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>*Sisa Pinjaman Karyawan: {formatRupiah(data.remaining_loan)}</Text>
             )}
        </View>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: 'bold', textAlign: 'right' }}>{formatRupiah(data.net_salary)}</Text>
      </View>

      {/* NOTES */}
      {data.notes ? (
          <Text style={styles.notes}>Catatan: {data.notes}</Text>
      ) : null}

      {/* TTD */}
      <View style={styles.footer}>
        <View style={styles.signBlock}>
          <Text>Penerima,</Text>
          <View style={styles.signLine} />
          <Text style={{ marginTop: 5, fontWeight: 'bold' }}>{data.full_name}</Text>
        </View>
        <View style={styles.signBlock}>
          <Text>Bandung, {new Date().toLocaleDateString('id-ID')}</Text>
          <Text>Finance,</Text>
          <View style={styles.signLine} />
          <Text style={{ marginTop: 5, fontWeight: 'bold' }}>( ...................... )</Text>
        </View>
      </View>

    </Page>
  </Document>
);