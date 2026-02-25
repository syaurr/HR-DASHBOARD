'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Loader2, Download, Eye, Calendar, Banknote, Receipt, Info } from "lucide-react";
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
  
  // Attendance Counts
  count_sick: number;
  count_permission: number;
  count_alpha: number;
  count_late: number;
  work_days: number; // HK

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
  
  total_income: number;
  total_deduction: number;
  net_salary: number;               
  remaining_loan: number;
  
  notes: string;
  status: string;
  period_display: string;
};

export default function PayrollListPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(today.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(today.getFullYear()));
  const [payrolls, setPayrolls] = useState<PayrollView[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<PayrollView | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchPayrollList();
  }, [selectedMonth, selectedYear]);

  const fetchPayrollList = async () => {
    setLoading(true);
    try {
        // 1. Ambil Data Payroll
        const { data: payrollData, error: payrollError } = await supabase
          .from("payrolls")
          .select(`
            *,
            crew:crew_id (id, full_name, role, bank_name, bank_account_number, outlets(name)), 
            outlets:outlet_id (name)
          `)
          .eq("period_month", Number(selectedMonth))
          .eq("period_year", Number(selectedYear))
          .order("net_salary", { ascending: false });

        if (payrollError) throw payrollError;

        // 2. Ambil Data Absensi (HK dihitung dari count_h + count_ht)
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance_summaries")
          .select("crew_id, count_h, count_ht")
          .eq("month", Number(selectedMonth))
          .eq("year", Number(selectedYear));

        if (attendanceError) throw attendanceError;

        // 3. Mapping HK ke dalam Map untuk pencarian cepat
        const hkMap = new Map();
        attendanceData?.forEach(att => {
            const totalHK = (att.count_h || 0) + (att.count_ht || 0);
            hkMap.set(att.crew_id, totalHK);
        });

        // 4. Gabungkan Data
        const formatted = payrollData.map((item: any) => ({
            ...item,
            // Ambil HK dari Map berdasarkan crew_id
            work_days: hkMap.get(item.crew_id) || 0,
            crew_name: item.crew?.full_name || "Unknown",
            crew_role: item.crew?.role || "-",
            outlet_name: item.outlets?.name || item.crew?.outlets?.name || "-",
            bank_name: item.crew?.bank_name || "-",
            account_number: item.crew?.bank_account_number || "-",
            period_display: `${getMonthName(item.period_month)} ${item.period_year}`
        }));

        setPayrolls(formatted);
    } catch (err: any) {
        toast.error("Gagal memuat data: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID").format(num);
  const getMonthName = (m: number) => ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][m - 1] || "";

  return (
    <div className="space-y-6 font-poppins text-[#022020]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Arsip Penggajian</h1>
          <p className="text-muted-foreground text-sm">Riwayat pembayaran gaji karyawan Balista.</p>
        </div>
        <Link href="/admin/payroll/create">
            <Button className="bg-[#033f3f] hover:bg-[#022020] rounded-xl shadow-lg transition-all active:scale-95">
                <Plus className="mr-2 h-4 w-4"/> Buat Payroll Baru
            </Button>
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4 font-inter">
         <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 shadow-sm"><Calendar className="w-5 h-5" /></div>
         <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px] rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent>
                    {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px] rounded-xl"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
            </Select>
         </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-xl overflow-hidden border-none font-inter">
        <Table>
          <TableHeader className="bg-[#033f3f]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-white font-bold py-4">Karyawan</TableHead>
              <TableHead className="text-white font-bold text-center">HK</TableHead>
              <TableHead className="text-white font-bold">Gaji Pokok</TableHead>
              <TableHead className="text-white font-bold">Total Bonus (+)</TableHead>
              <TableHead className="text-white font-bold">Potongan (-)</TableHead>
              <TableHead className="text-white font-bold text-right">Net Salary</TableHead>
              <TableHead className="text-white font-bold text-center w-[80px]">Opsi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-48"><Loader2 className="animate-spin h-10 w-10 mx-auto text-[#033f3f]"/></TableCell></TableRow>
            ) : payrolls.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-48 text-muted-foreground italic">Tidak ada data penggajian periode ini.</TableCell></TableRow>
            ) : (
                payrolls.map((row) => {
                    const totalBonus = row.commission_amount + row.meal_allowance + row.bonus + row.allowance_other;
                    return (
                        <TableRow key={row.id} className="hover:bg-emerald-50/30 transition-colors">
                            <TableCell>
                                <div className="font-bold text-[#022020]">{row.crew_name}</div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-tight font-medium">{row.outlet_name}</div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-blue-600 bg-blue-50/30">
                                <div className="flex items-center justify-center gap-1">
                                    {row.work_days}
                                    <div title="Data sinkron dengan absensi">
                                        <Info className="w-3 h-3 text-blue-300" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{formatRupiah(row.base_salary)}</TableCell>
                            <TableCell className="text-sm text-emerald-600 font-bold">+{formatRupiah(totalBonus)}</TableCell>
                            <TableCell className="text-sm text-red-600 font-bold">-{formatRupiah(row.total_deduction)}</TableCell>
                            <TableCell className="text-right">
                                <div className="text-lg font-black text-[#033f3f]">{formatRupiah(row.net_salary)}</div>
                            </TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-emerald-100"><MoreHorizontal className="h-5 w-5" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-emerald-100 w-48 font-poppins">
                                        <DropdownMenuLabel className="text-xs text-gray-400">Pilih Aksi</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => { setDetailData(row); setIsDetailOpen(true); }} className="cursor-pointer gap-2 py-2.5">
                                            <Eye className="h-4 w-4 text-emerald-600" /> Lihat Detail Lengkap
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 text-red-600">
                                            <Trash2 className="h-4 w-4" /> Hapus Data
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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-0 overflow-hidden border-none font-poppins">
            {detailData && (
                <>
                    <div className="bg-[#033f3f] p-6 text-white">
                        <DialogHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <DialogTitle className="text-2xl font-black">{detailData.crew_name}</DialogTitle>
                                    <p className="text-emerald-200 text-xs uppercase tracking-[0.2em] mt-1">{detailData.crew_role} | {detailData.outlet_name}</p>
                                </div>
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">{detailData.period_display}</Badge>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6 bg-gray-50/50">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Banknote className="w-3 h-3 text-emerald-600" /> Rincian Penerimaan (Income)
                            </h4>
                            <div className="bg-white p-4 rounded-2xl border border-emerald-50 shadow-sm space-y-2">
                                <div className="flex justify-between text-sm"><span>Gaji Pokok (HK: {detailData.work_days})</span> <span className="font-bold">{formatRupiah(detailData.base_salary)}</span></div>
                                <div className="flex justify-between text-sm"><span>Uang Makan</span> <span className="font-bold">{formatRupiah(detailData.meal_allowance)}</span></div>
                                <div className="flex justify-between text-sm"><span>Persenan Omzet</span> <span className="font-bold">{formatRupiah(detailData.commission_amount)}</span></div>
                                <div className="flex justify-between text-sm"><span>Bonus</span> <span className="font-bold">{formatRupiah(detailData.bonus)}</span></div>
                                <div className="flex justify-between text-sm"><span>Tunjangan Lain</span> <span className="font-bold">{formatRupiah(detailData.allowance_other)}</span></div>
                                <div className="border-t pt-2 mt-2 flex justify-between font-black text-[#033f3f]"><span>TOTAL BRUTO</span> <span>{formatRupiah(detailData.total_income)}</span></div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Receipt className="w-3 h-3 text-red-500" /> Rincian Potongan (Deduction)
                            </h4>
                            <div className="bg-white p-4 rounded-2xl border border-red-50 shadow-sm space-y-2">
                                <div className="flex justify-between text-sm text-red-600"><span>Sakit ({detailData.count_sick} hari)</span> <span>({formatRupiah(detailData.deduction_sick)})</span></div>
                                <div className="flex justify-between text-sm text-red-600"><span>Izin ({detailData.count_permission} hari)</span> <span>({formatRupiah(detailData.deduction_permission)})</span></div>
                                <div className="flex justify-between text-sm text-red-600"><span>Alpa ({detailData.count_alpha} hari)</span> <span>({formatRupiah(detailData.deduction_alpha)})</span></div>
                                <div className="flex justify-between text-sm text-red-600 font-bold border-t border-dashed pt-2"><span>Potongan Kasbon</span> <span>({formatRupiah(detailData.deduction_kasbon)})</span></div>
                                <div className="text-[9px] text-right text-gray-400 italic">Sisa Hutang: {formatRupiah(detailData.remaining_loan)}</div>
                            </div>
                        </div>

                        <div className="bg-[#033f3f] p-5 rounded-2xl flex items-center justify-between text-white shadow-xl shadow-emerald-900/20">
                            <div>
                                <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Gaji Bersih Diterima</p>
                                <p className="text-2xl font-black tracking-tighter">{formatRupiah(detailData.net_salary)}</p>
                            </div>
                            <PDFDownloadLink
                                document={<PayslipDocument data={detailData as any} />}
                                fileName={`Slip_${detailData.crew_name}.pdf`}
                            >
                                {({ loading }) => (
                                    <Button className="bg-emerald-500 hover:bg-emerald-400 rounded-xl px-6 font-bold shadow-lg h-12">
                                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Download className="w-5 h-5 mr-2" /> PDF</>}
                                    </Button>
                                )}
                            </PDFDownloadLink>
                        </div>
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}