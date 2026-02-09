'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Trash2, Loader2, Download, Eye, Calendar } from "lucide-react";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PayslipDocument } from "@/components/pdf/PayslipDocument";

// Tipe Data Sesuai Database Baru
type PayrollView = {
  id: string;
  
  // Relasi
  crew_name: string;
  crew_role?: string;
  outlet_name: string;
  bank_name: string;
  account_number: string;
  
  // Income
  base_salary: number;            
  commission_amount: number;
  meal_allowance: number;
  bonus: number;
  allowance_other: number;
  
  // Deduction
  deduction_sick: number;
  deduction_permission: number;
  deduction_alpha: number;
  deduction_kasbon: number;
  
  // Totals
  total_income: number;
  total_deduction: number;
  net_salary: number;              
  remaining_loan: number;
  
  // Metadata
  notes: string;
  status: string;
  period_display: string; // "Januari 2026"
};

export default function PayrollListPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(today.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(today.getFullYear()));
  
  const [payrolls, setPayrolls] = useState<PayrollView[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State Modal Detail
  const [detailData, setDetailData] = useState<PayrollView | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // FETCH DATA PAYROLL
  useEffect(() => {
    fetchPayrollList();
  }, [selectedMonth, selectedYear]);

  const fetchPayrollList = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
          .from("payrolls")
          .select(`
            *,
            crew:crew_id (full_name, role, bank_name, bank_account_number, outlets(name)), 
            outlets:outlet_id (name)
          `)
          .eq("period_month", Number(selectedMonth))
          .eq("period_year", Number(selectedYear))
          .order("net_salary", { ascending: false });

        if (error) throw error;

        const formatted = data.map((item: any) => ({
            id: item.id,
            crew_name: item.crew?.full_name || "Unknown",
            crew_role: item.crew?.role || "-",
            // Fallback outlet name
            outlet_name: item.outlets?.name || item.crew?.outlets?.name || "-",
            bank_name: item.crew?.bank_name || "-",
            account_number: item.crew?.bank_account_number || "-",
            
            // Income
            base_salary: item.base_salary || 0,
            commission_amount: item.commission_amount || 0,
            meal_allowance: item.meal_allowance || 0,
            bonus: item.bonus || 0,
            allowance_other: item.allowance_other || 0,
            
            // Deduction
            deduction_sick: item.deduction_sick || 0,
            deduction_permission: item.deduction_permission || 0,
            deduction_alpha: item.deduction_alpha || 0,
            deduction_kasbon: item.deduction_kasbon || 0,
            
            // Totals
            total_income: item.total_income || 0,
            total_deduction: item.total_deduction || 0,
            net_salary: item.net_salary || 0,
            remaining_loan: item.remaining_loan || 0,
            
            notes: item.notes || "",
            status: item.status,
            period_display: `${getMonthName(item.period_month)} ${item.period_year}`
        }));
        
        setPayrolls(formatted);
    } catch (err: any) {
        toast.error("Gagal memuat data: " + err.message);
    } finally {
        setLoading(false);
    }
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
  
  const getMonthName = (m: number) => {
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      return months[m - 1] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Penggajian</h1>
          <p className="text-muted-foreground">Arsip gaji karyawan per periode.</p>
        </div>
        <Link href="/admin/payroll/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4"/> Buat Payroll Baru
            </Button>
        </Link>
      </div>

      {/* FILTER PERIODE */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-3">
         <div className="p-2 bg-blue-50 rounded-full text-blue-600"><Calendar className="w-5 h-5" /></div>
         <span className="text-sm font-semibold whitespace-nowrap">Filter Periode:</span>
         <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue/></SelectTrigger>
            <SelectContent>
                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
            </SelectContent>
         </Select>
         <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]"><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
         </Select>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Outlet</TableHead>
              <TableHead>Gapok</TableHead>
              <TableHead className="text-green-700">Total Bonus</TableHead>
              <TableHead className="text-red-600">Total Potongan</TableHead>
              <TableHead className="font-bold text-blue-700">Total THP</TableHead>
              <TableHead className="text-center w-[50px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-32"><Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-500"/></TableCell></TableRow>
            ) : payrolls.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-32 text-muted-foreground">Belum ada data gaji untuk periode ini.</TableCell></TableRow>
            ) : (
                payrolls.map((row) => {
                    // Hitung Bonus Display (Selain Gapok)
                    const totalBonusDisplay = row.total_income - row.base_salary;

                    return (
                        <TableRow key={row.id} className="hover:bg-slate-50">
                            <TableCell className="font-medium">
                                {row.crew_name}
                                <div className="text-[10px] text-muted-foreground">{row.crew_role}</div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.outlet_name}</TableCell>
                            <TableCell className="text-xs">{formatRupiah(row.base_salary)}</TableCell>
                            <TableCell className="text-xs text-green-700 font-medium">+{formatRupiah(totalBonusDisplay)}</TableCell>
                            <TableCell className="text-xs text-red-600 font-medium">({formatRupiah(row.total_deduction)})</TableCell>
                            <TableCell className="font-bold text-blue-700 bg-blue-50/50">{formatRupiah(row.net_salary)}</TableCell>
                            
                            {/* MENU TITIK 3 */}
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-200">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => openDetail(row)}>
                                            <Eye className="mr-2 h-4 w-4" /> Rincian & PDF
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
                <div className="text-xs text-muted-foreground">{detailData?.outlet_name} - {detailData?.period_display}</div>
            </DialogHeader>
            
            {detailData && (
                <div className="space-y-4">
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-sm space-y-3 shadow-inner">
                        <div className="flex justify-between font-bold text-slate-800 border-b pb-2">
                            <span>Gaji Pokok</span> 
                            <span>{formatRupiah(detailData.base_salary)}</span>
                        </div>
                        
                        {/* INCOME */}
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Penerimaan Lain</p>
                            <div className="flex justify-between text-xs text-slate-600"><span>Uang Makan:</span> <span>{formatRupiah(detailData.meal_allowance)}</span></div>
                            <div className="flex justify-between text-xs text-slate-600"><span>Persenan Omzet:</span> <span>{formatRupiah(detailData.commission_amount)}</span></div>
                            <div className="flex justify-between text-xs text-slate-600"><span>Bonus:</span> <span>{formatRupiah(detailData.bonus)}</span></div>
                            <div className="flex justify-between text-xs text-slate-600"><span>Tunjangan Lain:</span> <span>{formatRupiah(detailData.allowance_other)}</span></div>
                        </div>

                        <div className="border-t border-dashed border-slate-300"></div>
                        
                        {/* DEDUCTION */}
                        <div className="space-y-1">
                             <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Potongan</p>
                             <div className="flex justify-between text-xs text-red-600"><span>Sakit:</span> <span>({formatRupiah(detailData.deduction_sick)})</span></div>
                             <div className="flex justify-between text-xs text-red-600"><span>Izin:</span> <span>({formatRupiah(detailData.deduction_permission)})</span></div>
                             <div className="flex justify-between text-xs text-red-600"><span>Alpa:</span> <span>({formatRupiah(detailData.deduction_alpha)})</span></div>
                             <div className="flex justify-between text-xs text-red-700 font-medium bg-red-50 px-1 rounded"><span>Kasbon:</span> <span>({formatRupiah(detailData.deduction_kasbon)})</span></div>
                             
                             {detailData.remaining_loan > 0 && (
                                <div className="text-[10px] text-right text-slate-400 italic mt-1">Sisa hutang: {formatRupiah(detailData.remaining_loan)}</div>
                             )}
                        </div>
                        
                        <div className="border-t border-slate-800 my-2 pt-3"></div>
                        <div className="flex justify-between font-black text-lg text-blue-800">
                            <span>TOTAL THP</span> <span>{formatRupiah(detailData.net_salary)}</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <PDFDownloadLink
                            document={<PayslipDocument data={{
                                full_name: detailData.crew_name,
                                role: detailData.crew_role,
                                outlet_name: detailData.outlet_name,
                                period_name: detailData.period_display,
                                bank_name: detailData.bank_name,
                                account_number: detailData.account_number,
                                
                                base_salary: detailData.base_salary,
                                meal_allowance: detailData.meal_allowance,
                                commission_amount: detailData.commission_amount,
                                bonus: detailData.bonus,
                                allowance_other: detailData.allowance_other,
                                
                                deduction_sick: detailData.deduction_sick,
                                deduction_permission: detailData.deduction_permission,
                                deduction_alpha: detailData.deduction_alpha,
                                deduction_kasbon: detailData.deduction_kasbon,
                                
                                total_income: detailData.total_income,
                                total_deduction: detailData.total_deduction,
                                net_salary: detailData.net_salary,
                                remaining_loan: detailData.remaining_loan,
                                notes: detailData.notes
                            } as any} />}
                            fileName={`Slip_${detailData.crew_name.replace(/\s+/g, '_')}_${detailData.period_display}.pdf`}
                            className="w-full"
                        >
                            {({ loading }) => (
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-md font-bold shadow-lg" disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Download className="mr-2 h-5 w-5"/>}
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