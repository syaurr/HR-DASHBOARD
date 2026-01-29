"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Calculator, Trophy, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

// Tipe Data untuk State Lokal
type PayrollDraft = {
  crew_id: string;
  full_name: string;
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

  // Data Ranking (Incentive)
  rank?: number;             // Juara ke berapa (1, 2, dst)
  rank_bonus_amount: number; // Nominal hadiahnya

  // Komponen Gaji (Editable)
  base_salary: number;      
  percentage_income: number;
  meal_allowance: number;   
  bonus: number;            // Ini nanti otomatis terisi (Incentive + Manual)
  allowance: number;        
  
  // Potongan
  deduction_sia: number;    
  kasbon: number;           
  remaining_loan: number;   
  
  // Hasil Akhir
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

  // 1. Load Data Periode
  useEffect(() => {
    const fetchPeriods = async () => {
      const { data } = await supabase.from("assessment_periods").select("id, name").order("created_at", { ascending: false });
      if (data) setPeriods(data);
    };
    fetchPeriods();
  }, []);

  // --- LOGIKA UTAMA: TARIK SEMUA DATA ---
  const handleGenerateDraft = async () => {
    if (!selectedPeriod) return toast.error("Pilih periode dahulu!");
    setLoading(true);

    try {
      // A. Ambil Data CREW & KONTRAK
      const { data: crews } = await supabase
        .from("crew")
        .select(`
          id, full_name, bank_name, bank_account_number,
          outlets(name),
          crew_contracts(base_salary, daily_meal_allowance)
        `)
        .eq("is_active", true)
        .order("full_name");

      // B. Ambil Data ABSENSI
      const { data: attendance } = await supabase
        .from("attendance_summaries")
        .select("*")
        .eq("period_id", selectedPeriod);

      // C. Ambil Data RANKING (Pemenang Bulan Ini)
      const { data: rankings } = await supabase
        .from("monthly_rankings")
        .select("crew_id, rank")
        .eq("period_id", selectedPeriod);

      // D. Ambil ATURAN BONUS INSENTIF (Juara 1 dpt berapa)
      const { data: incentiveRules } = await supabase
        .from("ranking_incentive_rules")
        .select("*");

      if (!crews) throw new Error("Data crew tidak ditemukan");

      // --- MAPPING DATA ---
      const draft: PayrollDraft[] = crews.map((crew) => {
        // 1. Setup Kontrak
        // @ts-ignore
        const contract = crew.crew_contracts?.[0] || { base_salary: 0, daily_meal_allowance: 0 };
        const gapok = Number(contract.base_salary);
        
        // 2. Setup Absensi
        const abs = attendance?.find(a => a.crew_id === crew.id);
        const count_ht = abs?.count_ht || 0;
        const count_s = abs?.count_s || 0;
        const count_i = abs?.count_i || 0;
        const count_a = abs?.count_a || 0;
        const count_off_sat = abs?.count_off_saturday || 0;
        const hasLetter = abs?.has_sick_letter || false;

        // 3. Setup Ranking & Insentif
        const userRankData = rankings?.find(r => r.crew_id === crew.id);
        let rankBonus = 0;
        let rankPos = undefined;
        
        if (userRankData && incentiveRules) {
            rankPos = userRankData.rank;
            // Cari nominal hadiah untuk ranking ini
            const rule = incentiveRules.find(r => r.rank_position === userRankData.rank);
            if (rule) rankBonus = Number(rule.bonus_amount);
        }

        // --- RUMUS HITUNGAN ---
        
        // Potongan (S/I/A = 50rb, Sabtu = 10rb)
        const total_deduction_sia = (count_s * 50000) + (count_i * 50000) + (count_a * 50000) + (count_off_sat * 10000);
        
        // Uang Makan (Hadir + HT) * Rate Harian
        const days_present = (abs?.count_h || 0) + count_ht;
        const uang_makan = days_present * Number(contract.daily_meal_allowance);

        return {
          crew_id: crew.id,
          full_name: crew.full_name,
          // @ts-ignore
          outlet_name: crew.outlets?.name || "-",
          bank_name: crew.bank_name || "-",
          account_number: crew.bank_account_number || "-",
          
          // Absen
          ht: count_ht,
          s: count_s,
          i: count_i,
          a: count_a,
          off_saturday: count_off_sat,
          has_sick_letter: hasLetter,

          // Rank
          rank: rankPos,
          rank_bonus_amount: rankBonus,

          // Keuangan
          base_salary: gapok,
          percentage_income: 0, 
          meal_allowance: uang_makan,
          bonus: rankBonus, // <-- AUTO FILL BONUS DENGAN INSENTIF RANKING
          allowance: 0,

          deduction_sia: total_deduction_sia,
          kasbon: 0,
          remaining_loan: 0,

          total_income: gapok + uang_makan + rankBonus,
          net_salary: (gapok + uang_makan + rankBonus) - total_deduction_sia
        };
      });

      setPayrollData(draft);
      setIsCalculated(true);
      toast.success("Data ditarik! Insentif ranking otomatis dimasukkan.");

    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATE SAAT DIEDIT ---
  const updateField = (index: number, field: keyof PayrollDraft, value: number) => {
    const newData = [...payrollData];
    // @ts-ignore
    newData[index][field] = value;

    // Recalculate Live
    const item = newData[index];
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
      const payload = payrollData.map(d => ({
        period_id: selectedPeriod,
        crew_id: d.crew_id,
        base_salary: d.base_salary,
        total_percentage_income: d.percentage_income,
        meal_allowance: d.meal_allowance,
        other_bonus: d.bonus, // Ini menyimpan Total Bonus (Insentif + Manual)
        allowance_other: d.allowance,
        deduction_sia: d.deduction_sia,
        deduction_kasbon: d.kasbon,
        remaining_loan: d.remaining_loan,
        total_income: d.total_income,
        net_salary: d.net_salary,
        
        // Catatan otomatis
        notes: [
            d.rank ? `Juara ${d.rank}` : null, 
            d.has_sick_letter ? "Lampiran Surat Sakit" : null
        ].filter(Boolean).join(", "),
        
        status: 'finalized'
      }));

      const { error } = await supabase
        .from("payrolls")
        .upsert(payload, { onConflict: "period_id, crew_id" });

      if (error) throw error;
      toast.success("Payroll berhasil disimpan permanen!");
      router.push("/admin/payroll");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buat Payroll Baru</h1>

      {/* FILTER CONTROL */}
      <div className="bg-white p-4 rounded border shadow-sm flex gap-4 items-end">
        <div className="space-y-2 w-[250px]">
          <label className="text-sm font-semibold">Pilih Periode</label>
          <Select onValueChange={setSelectedPeriod} disabled={isCalculated}>
            <SelectTrigger><SelectValue placeholder="Bulan..." /></SelectTrigger>
            <SelectContent>{periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={handleGenerateDraft} disabled={loading || isCalculated} className="mb-0.5">
          {loading ? <Loader2 className="animate-spin mr-2"/> : <Calculator className="mr-2 h-4 w-4"/>}
          Tarik Data & Hitung
        </Button>
        {isCalculated && (
           <Button variant="destructive" onClick={() => { setIsCalculated(false); setPayrollData([]); }} className="mb-0.5">
             Reset
           </Button>
        )}
      </div>

      {/* TABEL PERHITUNGAN */}
      {isCalculated && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-200 text-xs">
             <div className="flex gap-4 font-medium">
                <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-yellow-600"/> Dapat Insentif</span>
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-600"/> HT (Merah)</span>
                <span className="flex items-center gap-1"><Info className="h-3 w-3 text-green-600"/> Ada Surat (Hijau)</span>
             </div>
             <Button onClick={handleFinalize} disabled={loading} size="sm" className="bg-green-600 hover:bg-green-700">
                <Save className="mr-2 h-4 w-4"/> Simpan Permanen
             </Button>
          </div>

          <div className="rounded border bg-white overflow-x-auto shadow-sm">
            <Table className="text-xs w-full min-w-[1300px]">
              <TableHeader className="bg-slate-800">
                <TableRow>
                  <TableHead className="text-white w-[180px]">Nama & Info</TableHead>
                  <TableHead className="text-white w-[100px]">Bank</TableHead>
                  <TableHead className="text-white w-[90px]">Gapok</TableHead>
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
                  <TableRow key={row.crew_id}>
                    {/* INFO CREW */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                          <span className="font-bold">{row.full_name}</span>
                          {/* IKON PIALA JIKA JUARA */}
                          {row.rank && (
                              <div className="flex items-center text-yellow-600" title={`Juara ${row.rank} (+${formatRp(row.rank_bonus_amount)})`}>
                                  <Trophy className="h-3 w-3 fill-yellow-500" />
                                  <span className="text-[9px] font-bold">#{row.rank}</span>
                              </div>
                          )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-1">{row.outlet_name}</div>
                      
                      {/* BADGE ABSENSI */}
                      <div className="flex flex-wrap gap-1">
                        {row.ht > 0 && <Badge variant="destructive" className="text-[9px] px-1 h-4">HT: {row.ht}</Badge>}
                        {row.s > 0 && (
                            <Badge className={`text-[9px] px-1 h-4 ${row.has_sick_letter ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500'}`}>
                                S: {row.s} {row.has_sick_letter && "✓"}
                            </Badge>
                        )}
                        {row.i > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4">I: {row.i}</Badge>}
                        {row.a > 0 && <Badge variant="destructive" className="text-[9px] px-1 h-4">A: {row.a}</Badge>}
                        {row.off_saturday > 0 && <Badge variant="outline" className="text-[9px] px-1 h-4 bg-yellow-50 border-yellow-200 text-yellow-700">(-): {row.off_saturday}</Badge>}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                        <div className="truncate w-16" title={row.bank_name}>{row.bank_name}</div>
                        <div className="truncate w-16 text-[9px] text-muted-foreground">{row.account_number}</div>
                    </TableCell>

                    {/* INPUTS KEUNGAN */}
                    <TableCell><Input type="number" className="h-7 text-xs px-1" value={row.base_salary} onChange={e => updateField(idx, 'base_salary', Number(e.target.value))}/></TableCell>
                    <TableCell><Input type="number" className="h-7 text-xs px-1 bg-yellow-50" value={row.percentage_income} onChange={e => updateField(idx, 'percentage_income', Number(e.target.value))}/></TableCell>
                    <TableCell><Input type="number" className="h-7 text-xs px-1" value={row.meal_allowance} onChange={e => updateField(idx, 'meal_allowance', Number(e.target.value))}/></TableCell>
                    
                    {/* KOLOM BONUS (OTOMATIS + MANUAL) */}
                    <TableCell>
                        <Input type="number" className="h-7 text-xs px-1 text-green-700 font-semibold" value={row.bonus} onChange={e => updateField(idx, 'bonus', Number(e.target.value))}/>
                        {row.rank_bonus_amount > 0 && (
                            <div className="text-[9px] text-green-600 mt-0.5">
                                Termasuk Insentif: {formatRp(row.rank_bonus_amount)}
                            </div>
                        )}
                    </TableCell>
                    
                    <TableCell><Input type="number" className="h-7 text-xs px-1" value={row.allowance} onChange={e => updateField(idx, 'allowance', Number(e.target.value))}/></TableCell>
                    
                    {/* POTONGAN */}
                    <TableCell>
                         <Input type="number" className="h-7 text-xs px-1 text-red-600 font-bold bg-red-50" value={row.deduction_sia} onChange={e => updateField(idx, 'deduction_sia', Number(e.target.value))}/>
                    </TableCell>
                    <TableCell><Input type="number" className="h-7 text-xs px-1 text-red-600" value={row.kasbon} onChange={e => updateField(idx, 'kasbon', Number(e.target.value))}/></TableCell>
                    <TableCell><Input type="number" className="h-7 text-xs px-1" value={row.remaining_loan} onChange={e => updateField(idx, 'remaining_loan', Number(e.target.value))}/></TableCell>

                    {/* TOTAL */}
                    <TableCell className="text-right font-bold text-blue-700 text-sm bg-blue-50">
                        {formatRp(row.net_salary)}
                    </TableCell>
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