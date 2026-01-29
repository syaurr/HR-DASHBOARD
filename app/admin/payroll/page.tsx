"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, Trash2, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PayslipDocument } from "@/components/pdf/PayslipDocument";

// Tipe data untuk tampilan tabel
type PayrollView = {
  id: string;
  crew_name: string;
  crew_role?: string;
  outlet_name: string;
  bank_name: string;
  account_number: string;
  base_salary: number;
  total_percentage_income: number;
  meal_allowance: number;
  deduction_sia: number;
  deduction_kasbon: number;
  remaining_loan: number;
  other_bonus: number;
  allowance_other: number;
  total_income: number;
  net_salary: number;
  notes: string;
  status: string;
};

export default function PayrollListPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [payrolls, setPayrolls] = useState<PayrollView[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch Periods
  useEffect(() => {
    const fetchPeriods = async () => {
      const { data } = await supabase.from("assessment_periods").select("id, name").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setPeriods(data);
        setSelectedPeriodId(data[0].id);
      }
    };
    fetchPeriods();
  }, []);

  // 2. Fetch Payroll Data based on Period
  useEffect(() => {
    if (selectedPeriodId) fetchPayrollList();
  }, [selectedPeriodId]);

  const fetchPayrollList = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payrolls")
      .select(`
        *,
        crew:crew_id (full_name, role, bank_name, bank_account_number),
        outlets:outlet_id (name)
      `)
      .eq("period_id", selectedPeriodId)
      .order("net_salary", { ascending: false });

    if (error) {
      toast.error("Gagal memuat data payroll");
    } else {
      const formatted = data.map((item: any) => ({
        id: item.id,
        crew_name: item.crew?.full_name || "Unknown",
        crew_role: item.crew?.role,
        bank_name: item.crew?.bank_name || "-",
        account_number: item.crew?.bank_account_number || "-",
        outlet_name: item.outlets?.name || "-", // Jika outlet kosong bisa ambil dari relasi crew
        base_salary: item.base_salary,
        total_percentage_income: item.total_percentage_income,
        meal_allowance: item.meal_allowance,
        deduction_sia: item.deduction_sia,
        deduction_kasbon: item.deduction_kasbon,
        remaining_loan: item.remaining_loan,
        other_bonus: item.other_bonus,
        allowance_other: item.position_allowance || item.allowance_other || 0, // Handle nama kolom variatif
        total_income: item.total_income,
        net_salary: item.net_salary,
        notes: item.notes,
        status: item.status
      }));
      setPayrolls(formatted);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data gaji ini?")) return;
    const { error } = await supabase.from("payrolls").delete().eq("id", id);
    if (error) toast.error("Gagal menghapus");
    else {
        toast.success("Data dihapus");
        fetchPayrollList();
    }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Penggajian</h1>
          <p className="text-muted-foreground">Lihat dan cetak slip gaji yang sudah difinalisasi.</p>
        </div>
        
        <div className="flex gap-2">
            <Link href="/admin/payroll/create">
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4"/> Buat Payroll Baru
                </Button>
            </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded border shadow-sm">
         <span className="text-sm font-semibold">Filter Periode:</span>
         <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pilih Periode"/></SelectTrigger>
            <SelectContent>
                {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
         </Select>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Gapok</TableHead>
              <TableHead>T. Persenan</TableHead>
              <TableHead>Uang Makan</TableHead>
              <TableHead className="text-red-600">Pot. Absen</TableHead>
              <TableHead className="text-red-600">Kasbon</TableHead>
              <TableHead className="text-right font-bold text-blue-700">Total (THP)</TableHead>
              <TableHead className="text-center">Slip Gaji</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow>
            ) : payrolls.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center h-24 text-muted-foreground">Belum ada data untuk periode ini.</TableCell></TableRow>
            ) : (
                payrolls.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell>
                            <div className="font-medium">{row.crew_name}</div>
                            <div className="text-[10px] text-muted-foreground">{row.outlet_name}</div>
                            {row.notes && <Badge variant="outline" className="text-[10px] bg-yellow-50">{row.notes}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">
                            <div>{row.bank_name}</div>
                            <div className="text-muted-foreground">{row.account_number}</div>
                        </TableCell>
                        <TableCell className="text-xs">{formatRupiah(row.base_salary)}</TableCell>
                        <TableCell className="text-xs">{formatRupiah(row.total_percentage_income)}</TableCell>
                        <TableCell className="text-xs">{formatRupiah(row.meal_allowance)}</TableCell>
                        <TableCell className="text-xs text-red-600 font-medium">{formatRupiah(row.deduction_sia)}</TableCell>
                        <TableCell className="text-xs text-red-600">{formatRupiah(row.deduction_kasbon)}</TableCell>
                        
                        <TableCell className="text-right font-bold text-blue-700">
                            {formatRupiah(row.net_salary)}
                        </TableCell>
                        
                        <TableCell className="text-center">
                            <PDFDownloadLink
                                document={
                                    <PayslipDocument data={{
                                        ...row,
                                        full_name: row.crew_name,
                                        role: row.crew_role,
                                        period_name: periods.find(p => p.id === selectedPeriodId)?.name || "Periode"
                                    }} />
                                }
                                fileName={`SLIP_${row.crew_name.replace(/\s/g,'_')}.pdf`}
                            >
                                {({ loading }) => (
                                    <Button variant="ghost" size="sm" disabled={loading}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Printer className="h-4 w-4 text-slate-600"/>}
                                    </Button>
                                )}
                            </PDFDownloadLink>
                        </TableCell>
                        <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                                <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600"/>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}