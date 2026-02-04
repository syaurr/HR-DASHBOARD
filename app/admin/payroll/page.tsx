"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Trash2, Loader2, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PayslipDocument } from "@/components/pdf/PayslipDocument";

// Tipe Data
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
  ranking_incentive: number; 
  other_bonus: number;
  allowance_other: number;
  
  deduction_sia: number;
  deduction_kasbon: number;
  remaining_loan: number;
  
  total_income: number;
  net_salary: number;             
  
  notes: string;
  status: string;
  period_name: string;
};

export default function PayrollListPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [payrolls, setPayrolls] = useState<PayrollView[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State Modal Detail
  const [detailData, setDetailData] = useState<PayrollView | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. Fetch Periode
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

  // 2. Fetch Data Payroll
  useEffect(() => {
    if (selectedPeriodId) fetchPayrollList();
  }, [selectedPeriodId]);

  const fetchPayrollList = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payrolls")
      .select(`
        *,
        crew:crew_id (full_name, role, bank_name, bank_account_number, outlets(name)), 
        outlets:outlet_id (name)
      `)
      .eq("period_id", selectedPeriodId)
      .order("net_salary", { ascending: false });

    if (error) {
      toast.error("Gagal memuat data");
    } else {
      const formatted = data.map((item: any) => ({
        id: item.id,
        crew_name: item.crew?.full_name || "Unknown",
        crew_role: item.crew?.role,
        bank_name: item.crew?.bank_name || "-",
        account_number: item.crew?.bank_account_number || "-",
        
        // LOGIKA FALLBACK OUTLET:
        // Cek di tabel payrolls (outlets.name), kalau kosong cek di master crew (crew.outlets.name)
        outlet_name: item.outlets?.name || item.crew?.outlets?.name || "-",
        
        base_salary: item.base_salary || 0,
        total_percentage_income: item.total_percentage_income || 0,
        meal_allowance: item.meal_allowance || 0,
        ranking_incentive: item.ranking_incentive || 0, 
        other_bonus: item.other_bonus || 0,
        allowance_other: item.allowance_other || 0, 
        
        deduction_sia: item.deduction_sia || 0,
        deduction_kasbon: item.deduction_kasbon || 0,
        remaining_loan: item.remaining_loan || 0,
        
        total_income: item.total_income || 0,
        net_salary: item.net_salary || 0,
        
        notes: item.notes,
        status: item.status,
        period_name: periods.find(p => p.id === selectedPeriodId)?.name || "Periode"
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

  const openDetail = (item: PayrollView) => {
      setDetailData(item);
      setIsDetailOpen(true);
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Penggajian</h1>
          <p className="text-muted-foreground">Kelola gaji karyawan per periode.</p>
        </div>
        <Link href="/admin/payroll/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4"/> Buat Payroll Baru
            </Button>
        </Link>
      </div>

      <div className="bg-white p-4 rounded border shadow-sm flex items-center gap-2">
         <span className="text-sm font-semibold whitespace-nowrap">Periode Gaji:</span>
         <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-[250px]"><SelectValue placeholder="Pilih Periode"/></SelectTrigger>
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
              <TableHead>Outlet</TableHead>
              <TableHead>Gapok</TableHead>
              <TableHead className="text-green-700">Total Bonus</TableHead>
              <TableHead className="text-red-600">Total Potongan</TableHead>
              <TableHead className="font-bold text-blue-700">Total THP</TableHead>
              <TableHead className="text-center w-[50px]">Rincian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow>
            ) : payrolls.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Belum ada data untuk periode ini.</TableCell></TableRow>
            ) : (
                payrolls.map((row) => {
                    // Kalkulasi Total Bonus untuk tampilan Tabel (Gabungan semua income selain Gapok)
                    const totalBonus = row.ranking_incentive + row.other_bonus + row.total_percentage_income + row.allowance_other + row.meal_allowance;
                    const totalDeduction = row.deduction_sia + row.deduction_kasbon;

                    return (
                        <TableRow key={row.id}>
                            <TableCell className="font-medium">
                                {row.crew_name}
                                {row.ranking_incentive > 0 && <Badge className="ml-2 text-[9px] bg-yellow-500 hover:bg-yellow-600">Juara</Badge>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.outlet_name}</TableCell>
                            <TableCell className="text-xs">{formatRupiah(row.base_salary)}</TableCell>
                            <TableCell className="text-xs text-green-700 font-medium">+{formatRupiah(totalBonus)}</TableCell>
                            <TableCell className="text-xs text-red-600 font-medium">({formatRupiah(totalDeduction)})</TableCell>
                            <TableCell className="font-bold text-blue-700">{formatRupiah(row.net_salary)}</TableCell>
                            
                            {/* MENU TITIK 3 */}
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => openDetail(row)}>
                                            <Eye className="mr-2 h-4 w-4" /> Lihat Detail & PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600 focus:text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" /> Hapus Data
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    );
                })
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL DETAIL & DOWNLOAD PDF */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Rincian Gaji: {detailData?.crew_name}</DialogTitle>
                <div className="text-xs text-muted-foreground">{detailData?.outlet_name} - {detailData?.period_name}</div>
            </DialogHeader>
            
            {detailData && (
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border text-sm space-y-2">
                        <div className="flex justify-between font-semibold border-b pb-1"><span>Gaji Pokok:</span> <span>{formatRupiah(detailData.base_salary)}</span></div>
                        
                        <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-xs text-muted-foreground"><span>Uang Makan:</span> <span>{formatRupiah(detailData.meal_allowance)}</span></div>
                            <div className="flex justify-between text-xs text-muted-foreground"><span>Persenan Omzet:</span> <span>{formatRupiah(detailData.total_percentage_income)}</span></div>
                            <div className="flex justify-between text-xs text-green-700 font-medium"><span>Insentif Ranking:</span> <span>{formatRupiah(detailData.ranking_incentive)}</span></div>
                            <div className="flex justify-between text-xs text-muted-foreground"><span>Bonus Lainnya:</span> <span>{formatRupiah(detailData.other_bonus)}</span></div>
                            <div className="flex justify-between text-xs text-muted-foreground"><span>Tunjangan Lain:</span> <span>{formatRupiah(detailData.allowance_other)}</span></div>
                        </div>

                        <div className="border-t border-slate-200 my-2"></div>
                        
                        <div className="space-y-1">
                             <div className="flex justify-between text-red-600"><span>Potongan Absensi:</span> <span>({formatRupiah(detailData.deduction_sia)})</span></div>
                             <div className="flex justify-between text-red-600"><span>Potongan Kasbon:</span> <span>({formatRupiah(detailData.deduction_kasbon)})</span></div>
                             {detailData.remaining_loan > 0 && (
                                <div className="text-[10px] text-right text-muted-foreground italic">Sisa hutang: {formatRupiah(detailData.remaining_loan)}</div>
                             )}
                        </div>
                        
                        <div className="border-t border-slate-900 my-2 pt-2"></div>
                        <div className="flex justify-between font-bold text-lg text-blue-800">
                            <span>TOTAL THP:</span> <span>{formatRupiah(detailData.net_salary)}</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <PDFDownloadLink
                            document={<PayslipDocument data={{
                                full_name: detailData.crew_name,
                                role: detailData.crew_role,
                                outlet_name: detailData.outlet_name,
                                period_name: detailData.period_name,
                                bank_name: detailData.bank_name,
                                account_number: detailData.account_number,
                                base_salary: detailData.base_salary,
                                total_percentage_income: detailData.total_percentage_income,
                                meal_allowance: detailData.meal_allowance,
                                ranking_incentive: detailData.ranking_incentive,
                                other_bonus: detailData.other_bonus,
                                allowance_other: detailData.allowance_other,
                                deduction_sia: detailData.deduction_sia,
                                deduction_kasbon: detailData.deduction_kasbon,
                                remaining_loan: detailData.remaining_loan,
                                total_income: detailData.total_income,
                                net_salary: detailData.net_salary,
                                notes: detailData.notes
                            } as any} />}
                            fileName={`Slip_${detailData.crew_name.replace(/\s+/g, '_')}_${detailData.period_name}.pdf`}
                            className="w-full"
                        >
                            {({ loading }) => (
                                <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                                    Download Slip Gaji (PDF)
                                </Button>
                            )}
                        </PDFDownloadLink>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}