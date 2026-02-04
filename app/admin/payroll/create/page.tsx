"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Calculator, Trophy, AlertTriangle, Info, CalendarX } from "lucide-react";
import { toast } from "sonner";
import { differenceInCalendarDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

// --- TIPE DATA ---
type PayrollDraft = {
  crew_id: string;
  full_name: string;
  outlet_id: string;
  outlet_name: string;
  bank_name: string;
  account_number: string;
  
  // Data Absensi
  ht: number;
  s: number;
  i: number;
  a: number;
  off_saturday: number; 
  has_sick_letter: boolean;
  
  // Data Karir (Untuk Prorata)
  join_date: string | null;
  resign_date: string | null;
  is_prorated: boolean; // Flag penanda gaji prorata
  work_days_prorata?: number; // Hari kerja aktual (jika prorata)

  // Komponen Gaji
  rank?: number;
  rank_bonus_amount: number;

  base_salary: number;      
  percentage_income: number;
  meal_allowance: number;   
  bonus: number;
  allowance: number;        
  
  // Potongan
  deduction_sia: number;    
  kasbon: number;           
  remaining_loan: number;
  total_debt_balance: number;

  // Total
  total_income: number;
  net_salary: number;
};

export default function CreatePayrollPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [payrollData, setPayrollData] = useState<PayrollDraft[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);

  // 1. Load Periode
  useEffect(() => {
    const fetchPeriods = async () => {
      const { data } = await supabase.from("assessment_periods").select("*").order("created_at", { ascending: false });
      if (data) setPeriods(data);
    };
    fetchPeriods();
  }, []);

  // 2. FUNGSI UTAMA: TARIK DATA & HITUNG GAJI
  const handleGenerateDraft = async () => {
    if (!selectedPeriod) return toast.error("Pilih periode dahulu!");
    setLoading(true);

    try {
      // A. Ambil Data Master Crew (Termasuk yang Non-Aktif jika dia resign di periode ini)
      const { data: crews } = await supabase
        .from("crew")
        .select(`
          id, full_name, outlet_id, bank_name, bank_account_number, join_date, resign_date, is_active,
          outlets(name),
          crew_contracts(base_salary, daily_meal_allowance)
        `)
        .order("full_name");

      // B. Ambil Data Penunjang (Absen, Ranking, Kasbon, Aturan Insentif)
      const { data: attendance } = await supabase.from("attendance_summaries").select("*").eq("period_id", selectedPeriod);
      const { data: rankings } = await supabase.from("monthly_rankings").select("crew_id, rank").eq("period_id", selectedPeriod);
      const { data: incentiveRules } = await supabase.from("ranking_incentive_rules").select("*");
      const { data: cashAdvances } = await supabase.from("cash_advances").select("*").eq("status", "approved").gt("remaining_amount", 0);
      
      // Ambil detail periode untuk cek tanggal prorata
      const currentPeriod = periods.find(p => p.id === selectedPeriod);
      if (!currentPeriod || !crews) throw new Error("Data tidak lengkap");

      // C. LOOPING HITUNG GAJI PER KARYAWAN
      const draft: PayrollDraft[] = crews
        .filter(crew => {
            // Filter: Hanya proses Crew Aktif ATAU Crew yang resign di dalam periode ini
            if (crew.is_active) return true;
            if (crew.resign_date) {
                const resign = new Date(crew.resign_date);
                const start = new Date(currentPeriod.start_date);
                const end = new Date(currentPeriod.end_date);
                return resign >= start && resign <= end;
            }
            return false;
        })
        .map((crew) => {
        
        // --- 1. DATA KONTRAK & ABSENSI ---
        // @ts-ignore
        const contract = crew.crew_contracts?.[0] || { base_salary: 0, daily_meal_allowance: 0 };
        const baseGapok = Number(contract.base_salary);
        
        const abs = attendance?.find(a => a.crew_id === crew.id);
        const count_h = abs?.count_h || 0;
        const count_ht = abs?.count_ht || 0;
        const count_s = abs?.count_s || 0;
        const count_i = abs?.count_i || 0;
        const count_a = abs?.count_a || 0;
        const count_off_sat = abs?.count_off_saturday || 0; // (-) Tidak hadir sabtu
        const hasLetter = abs?.has_sick_letter || false;

        // --- 2. HITUNG GAJI POKOK (PRORATA LOGIC) ---
        let finalGapok = baseGapok;
        let isProrated = false;
        let workDaysProrata = 0;

        // Cek apakah Prorata diperlukan (Anak Baru atau Resign)
        const pStart = new Date(currentPeriod.start_date);
        const pEnd = new Date(currentPeriod.end_date);
        const joinDate = crew.join_date ? new Date(crew.join_date) : null;
        const resignDate = crew.resign_date ? new Date(crew.resign_date) : null;

        // Logika Prorata: (Gapok / 26) * Hari Kerja Efektif
        // Kita asumsikan pembagi standar adalah 26 hari kerja
        const STANDARD_WORK_DAYS = 26; 

        if ((joinDate && joinDate > pStart) || (resignDate && resignDate < pEnd)) {
            isProrated = true;
            // Hitung hari kerja efektif crew ini di periode ini
            // (Sederhana: H + HT + S + I + A + C + Off - Off Sabtu) -> Ini adalah hari dia "tercatat"
            // Atau hitung selisih tanggal kalender
            
            let effectiveStart = joinDate && joinDate > pStart ? joinDate : pStart;
            let effectiveEnd = resignDate && resignDate < pEnd ? resignDate : pEnd;
            
            // Hitung selisih hari kalender
            const calendarDays = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
            
            // Kurangi hari minggu (asumsi libur) secara kasar atau pakai data kehadiran riil
            // Untuk akurasi tinggi sesuai request "DIKALIKAN HARI KERJA DIA":
            // Hari Kerja Dia = Total Kehadiran (H+HT) + Izin Sah (Cuti/Sakit/Izin) + Alpha (tetap dihitung hari kerja tapi nanti dipotong denda)
            // Jadi: workDaysProrata = H + HT + S + I + A + C + Off
            
            workDaysProrata = count_h + count_ht + count_s + count_i + count_a + (abs?.count_c || 0) + (abs?.count_off || 0);

            // RUMUS PRORATA: (Gapok / 26) * Hari Kerja Dia
            finalGapok = (baseGapok / STANDARD_WORK_DAYS) * workDaysProrata;
        }

        // --- 3. HITUNG POTONGAN ABSENSI (ATURAN BARU) ---
        // Sakit/Izin/Alpa = 50.000 per kejadian
        const deduction_sia_amount = (count_s + count_i + count_a) * 50000;
        
        // Tidak Hadir Sabtu = Potong 10.000 per kejadian (mengurangi jatah 40rb)
        const deduction_saturday = count_off_sat * 10000;

        const total_deduction_attendance = deduction_sia_amount + deduction_saturday;

        // --- 4. HITUNG UANG MAKAN ---
        // (Hadir + Hadir Telat) * Rate Harian
        const uang_makan = (count_h + count_ht) * Number(contract.daily_meal_allowance);

        // --- 5. INSENTIF RANKING ---
        const userRankData = rankings?.find(r => r.crew_id === crew.id);
        let rankBonus = 0;
        let rankPos = undefined;
        if (userRankData && incentiveRules) {
            rankPos = userRankData.rank;
            const rule = incentiveRules.find(r => r.rank_position === userRankData.rank);
            if (rule) rankBonus = Number(rule.bonus_amount);
        }

        // --- 6. KASBON ---
        const crewLoans = cashAdvances?.filter(c => c.crew_id === crew.id) || [];
        let total_planned_deduction = 0;
        let total_remaining_debt_start = 0;
        crewLoans.forEach(loan => {
            const sisa = Number(loan.remaining_amount);
            const rencana = Number(loan.deduction_plan_amount);
            total_remaining_debt_start += sisa;
            total_planned_deduction += (sisa < rencana ? sisa : rencana);
        });
        const remaining_after_deduction = total_remaining_debt_start - total_planned_deduction;

        // --- 7. FINAL CALCULATION ---
        const total_income = finalGapok + uang_makan + rankBonus; 
        // Persenan Omzet & Tunjangan Lain diinput manual nanti di tabel

        return {
          crew_id: crew.id,
          full_name: crew.full_name,
          outlet_id: crew.outlet_id,
          // @ts-ignore
          outlet_name: crew.outlets?.name || "-",
          bank_name: crew.bank_name || "-",
          account_number: crew.bank_account_number || "-",
          
          ht: count_ht,
          s: count_s,
          i: count_i,
          a: count_a,
          off_saturday: count_off_sat,
          has_sick_letter: hasLetter,

          join_date: crew.join_date,
          resign_date: crew.resign_date,
          is_prorated: isProrated,
          work_days_prorata: workDaysProrata,

          rank: rankPos,
          rank_bonus_amount: rankBonus,

          base_salary: Math.round(finalGapok), // Bulatkan gapok prorata
          percentage_income: 0, 
          meal_allowance: uang_makan,
          bonus: rankBonus, 
          allowance: 0,

          deduction_sia: total_deduction_attendance, // Total denda S/I/A + Sabtu
          kasbon: total_planned_deduction,
          remaining_loan: remaining_after_deduction,
          total_debt_balance: total_remaining_debt_start,

          total_income: total_income,
          net_salary: total_income - (total_deduction_attendance + total_planned_deduction)
        };
      });

      setPayrollData(draft);
      setIsCalculated(true);
      toast.success(`Berhasil menghitung gaji untuk ${draft.length} karyawan.`);

    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATE FIELD SAAT EDIT DI TABEL ---
  const updateField = (index: number, field: keyof PayrollDraft, value: number) => {
    const newData = [...payrollData];
    // @ts-ignore
    newData[index][field] = value;
    const item = newData[index];

    if (field === 'kasbon') {
        let newRemaining = item.total_debt_balance - value;
        if (newRemaining < 0) newRemaining = 0;
        item.remaining_loan = newRemaining;
    }

    const gross = item.base_salary + item.percentage_income + item.meal_allowance + item.bonus + item.allowance;
    const deductions = item.deduction_sia + item.kasbon;
    
    item.total_income = gross;
    item.net_salary = gross - deductions;

    setPayrollData(newData);
  };

  // --- SIMPAN KE DATABASE ---
  const handleFinalize = async () => {
    setLoading(true);
    try {
      const payload = payrollData.map(d => {
        const totalDeductions = d.deduction_sia + d.kasbon;
        const manualBonus = d.bonus - (d.rank_bonus_amount || 0);

        // Susun Catatan Otomatis
        let notesParts = [];
        if (d.rank) notesParts.push(`Juara ${d.rank}`);
        if (d.has_sick_letter) notesParts.push("Ada Surat Sakit");
        if (d.is_prorated) notesParts.push(`Gaji Prorata (${d.work_days_prorata} hari)`);
        if (d.off_saturday > 0) notesParts.push(`Pot. Sabtu x${d.off_saturday}`);
        
        return {
            period_id: selectedPeriod,
            crew_id: d.crew_id,
            outlet_id: d.outlet_id,
            
            base_salary: d.base_salary,
            total_percentage_income: d.percentage_income,
            meal_allowance: d.meal_allowance,
            ranking_incentive: d.rank_bonus_amount || 0,
            other_bonus: manualBonus,
            allowance_other: d.allowance,
            
            deduction_sia: d.deduction_sia,
            deduction_kasbon: d.kasbon,
            remaining_loan: d.remaining_loan,
            
            gross_salary: d.total_income,
            total_deduction: totalDeductions,
            total_income: d.total_income,
            net_salary: d.net_salary,
            
            notes: notesParts.join(", "),
            status: 'finalized'
        };
      });

      const { error } = await supabase.from("payrolls").upsert(payload, { onConflict: "period_id, crew_id" });
      if (error) throw error;

      toast.success("Payroll berhasil disimpan!");
      router.push("/admin/payroll");
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold">Buat Payroll Baru</h1>
            <p className="text-muted-foreground text-sm">Menghitung gaji, potongan absensi, dan insentif secara otomatis.</p>
         </div>
       </div>

       <div className="bg-white p-4 rounded border shadow-sm flex gap-4 items-end">
          <div className="space-y-2 w-[250px]">
             <label className="text-sm font-semibold">Pilih Periode</label>
             <Select onValueChange={setSelectedPeriod} disabled={isCalculated}>
                <SelectTrigger><SelectValue placeholder="Bulan..." /></SelectTrigger>
                <SelectContent>{periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
             </Select>
          </div>
          <Button onClick={handleGenerateDraft} disabled={loading || isCalculated} className="mb-0.5 bg-blue-600 hover:bg-blue-700">
             {loading ? <Loader2 className="animate-spin mr-2"/> : <Calculator className="mr-2 h-4 w-4"/>} Tarik Data & Hitung
          </Button>
          {isCalculated && <Button variant="destructive" onClick={() => { setIsCalculated(false); setPayrollData([]); }} className="mb-0.5">Reset</Button>}
       </div>

       {isCalculated && (
         <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-200 text-xs">
                <div className="flex gap-4 font-medium">
                   <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-yellow-600"/> Insentif</span>
                   <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-600"/> Potongan Absensi</span>
                   <span className="flex items-center gap-1"><Info className="h-3 w-3 text-green-600"/> Surat Sakit</span>
                   <span className="flex items-center gap-1"><CalendarX className="h-3 w-3 text-purple-600"/> Prorata</span>
                </div>
                <Button onClick={handleFinalize} disabled={loading} size="sm" className="bg-green-600 hover:bg-green-700">
                   <Save className="mr-2 h-4 w-4"/> Simpan Permanen
                </Button>
            </div>
            
            <div className="rounded border bg-white overflow-x-auto shadow-sm">
                <Table className="text-xs w-full min-w-[1400px]">
                    <TableHeader className="bg-slate-800">
                        <TableRow>
                            <TableHead className="text-white w-[200px]">Nama & Info</TableHead>
                            <TableHead className="text-white w-[100px]">Bank</TableHead>
                            <TableHead className="text-white w-[100px]">Gapok</TableHead>
                            <TableHead className="text-white w-[90px]">Persenan</TableHead>
                            <TableHead className="text-white w-[90px]">U. Makan</TableHead>
                            <TableHead className="text-white w-[100px] bg-yellow-600/20">Bonus</TableHead>
                            <TableHead className="text-white w-[90px]">Tunjangan</TableHead>
                            <TableHead className="text-white w-[100px] bg-red-900/50">Pot. Absen</TableHead>
                            <TableHead className="text-white w-[90px] bg-red-900/50">Kasbon</TableHead>
                            <TableHead className="text-white w-[90px] bg-red-900/50">Sisa Hutang</TableHead>
                            <TableHead className="text-white text-right font-bold w-[120px] bg-blue-900">DITERIMA</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payrollData.map((row, idx) => (
                            <TableRow key={row.crew_id} className="hover:bg-slate-50">
                                <TableCell>
                                    <div className="font-bold text-sm">{row.full_name}</div>
                                    <div className="text-[10px] text-muted-foreground mb-1">{row.outlet_name}</div>
                                    <div className="flex flex-wrap gap-1">
                                       {/* Badge Absensi */}
                                       {row.s > 0 && <Badge className={`text-[9px] px-1 h-4 ${row.has_sick_letter ? 'bg-green-600' : 'bg-gray-500'}`}>S: {row.s} {row.has_sick_letter && "✓"}</Badge>}
                                       {row.i > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4 border-slate-300">I: {row.i}</Badge>}
                                       {row.a > 0 && <Badge variant="destructive" className="text-[9px] px-1 h-4">A: {row.a}</Badge>}
                                       {row.off_saturday > 0 && <Badge variant="outline" className="text-[9px] px-1 h-4 border-red-300 text-red-600">Sabtu: -{row.off_saturday}</Badge>}
                                       
                                       {/* Badge Prorata */}
                                       {row.is_prorated && <Badge variant="outline" className="text-[9px] px-1 h-4 border-purple-400 text-purple-700 bg-purple-50">Prorata</Badge>}
                                       
                                       {/* Badge Ranking */}
                                       {row.rank && <div className="flex items-center text-yellow-600 border border-yellow-200 bg-yellow-50 px-1 rounded text-[9px]"><Trophy className="h-3 w-3 fill-yellow-500 mr-1"/>#{row.rank}</div>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="truncate w-16 font-medium">{row.bank_name}</div>
                                    <div className="truncate w-20 text-[9px] text-muted-foreground">{row.account_number}</div>
                                </TableCell>
                                <TableCell>
                                    <Input type="number" className={`h-7 text-xs px-1 ${row.is_prorated ? 'text-purple-700 font-semibold' : ''}`} value={row.base_salary} onChange={e => updateField(idx, 'base_salary', Number(e.target.value))}/>
                                </TableCell>
                                <TableCell><Input type="number" className="h-7 text-xs px-1 bg-yellow-50 focus:bg-white" value={row.percentage_income} onChange={e => updateField(idx, 'percentage_income', Number(e.target.value))}/></TableCell>
                                <TableCell><Input type="number" className="h-7 text-xs px-1" value={row.meal_allowance} onChange={e => updateField(idx, 'meal_allowance', Number(e.target.value))}/></TableCell>
                                <TableCell>
                                    <Input type="number" className="h-7 text-xs px-1 text-green-700 font-semibold" value={row.bonus} onChange={e => updateField(idx, 'bonus', Number(e.target.value))}/>
                                    {row.rank_bonus_amount > 0 && <div className="text-[9px] text-green-600 mt-0.5">Bonus Rank: {formatRp(row.rank_bonus_amount)}</div>}
                                </TableCell>
                                <TableCell><Input type="number" className="h-7 text-xs px-1" value={row.allowance} onChange={e => updateField(idx, 'allowance', Number(e.target.value))}/></TableCell>
                                <TableCell>
                                    <Input type="number" className="h-7 text-xs px-1 text-red-600 font-bold bg-red-50" value={row.deduction_sia} onChange={e => updateField(idx, 'deduction_sia', Number(e.target.value))}/>
                                </TableCell>
                                <TableCell><Input type="number" className="h-7 text-xs px-1 text-red-600" value={row.kasbon} onChange={e => updateField(idx, 'kasbon', Number(e.target.value))}/></TableCell>
                                <TableCell><Input type="number" className="h-7 text-xs px-1 bg-gray-100 text-gray-500" value={row.remaining_loan} readOnly /></TableCell>
                                <TableCell className="text-right font-bold text-blue-700 text-sm bg-blue-50 border-l">{formatRp(row.net_salary)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
         </div>
       )}
    </div>
  );
}