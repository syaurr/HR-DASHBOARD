'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// --- KONFIGURASI MATRIKS GAJI ---
const SALARY_MATRIX: any = {
    "Berpengalaman": {
        "DineIn": [2000000, 2000000, 1750000], 
        "Express": [2000000, 1750000, 1500000]
    },
    "Non-Pengalaman": {
        "DineIn": [1750000, 1750000, 1500000],
        "Express": [1750000, 1500000, 1250000]
    }
};

export default function CreatePayrollPage() {
    const [loading, setLoading] = useState(false);
    const [crewList, setCrewList] = useState<any[]>([]);
    
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState<string>(String(today.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>(String(today.getFullYear()));

    const [payrollEntries, setPayrollEntries] = useState<Record<string, any>>({});

    // 1. INIT DATA
    const initData = async () => {
        setLoading(true);
        try {
            // FIX: Ambil dari 'crew_contracts' sesuai kode referensi kamu
            const { data: crews, error: errCrew } = await supabase
                .from('crew')
                .select(`
                    id, full_name, join_date,
                    outlets ( id, name ),
                    crew_contracts ( 
                        contract_type, experience_level, outlet_type, base_salary 
                    )
                `)
                .eq('is_active', true)
                .order('full_name');

            if (errCrew) throw errCrew;

            const { data: activeLoans, error: errLoan } = await supabase
                .from('cash_advances')
                .select('crew_id, approved_deduction_amount, remaining_balance_end') 
                .eq('status', 'approved')
                .gt('remaining_balance_end', 0);

            if (errLoan) throw errLoan;

            const loanMap: Record<string, any> = {};
            activeLoans?.forEach((loan: any) => {
                loanMap[loan.crew_id] = {
                    cicilan: loan.approved_deduction_amount, 
                    sisa: loan.remaining_balance_end
                };
            });

            const initialEntries: any = {};
            crews?.forEach((crew: any) => {
                // FIX: Ambil data kontrak dari array ke-0
                const contract = crew.crew_contracts?.[0] || {};
                
                const calculation = calculateBaseSalary(
                    crew.join_date, 
                    contract.experience_level, 
                    contract.outlet_type, 
                    contract.base_salary
                );

                const loanInfo = loanMap[crew.id];
                const deductionKasbon = loanInfo ? loanInfo.cicilan : 0;
                const remainingLoan = loanInfo ? loanInfo.sisa : 0;

                initialEntries[crew.id] = {
                    ...calculation, // basic_salary, month_nth, original_rate
                    commission: 0,
                    bonus: 0,
                    allowance_other: 0,
                    work_days: 26, 
                    count_sick: 0,
                    count_permission: 0,
                    count_alpha: 0,
                    count_late: 0, 
                    count_saturday_off: 0,
                    meal_allowance: 40000, 
                    deduction_sick: 0,
                    deduction_permission: 0,
                    deduction_alpha: 0,
                    deduction_kasbon: deductionKasbon,
                    remaining_loan: remainingLoan, 
                    outlet_id: crew.outlets?.id,
                    notes: loanInfo ? `Potong Kasbon: ${deductionKasbon}` : ''
                };
            });

            setCrewList(crews || []);
            setPayrollEntries(initialEntries);

        } catch (err: any) {
            toast.error("Gagal init data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { initData(); }, [selectedMonth, selectedYear]);

    // 2. HITUNG GAPOK
    const calculateBaseSalary = (joinDateStr: string, expLevel: string, outletType: string, contractSalary: number) => {
        if (!joinDateStr) return { basic_salary: 0, month_nth: 0, original_rate: 0 };

        const joinDate = new Date(joinDateStr);
        const payrollDate = new Date(Number(selectedYear), Number(selectedMonth) - 1, 25);

        let monthDiff = (payrollDate.getFullYear() - joinDate.getFullYear()) * 12 + (payrollDate.getMonth() - joinDate.getMonth()) + 1;
        if (monthDiff < 1) monthDiff = 1; 

        let salary = contractSalary || 0;

        // Logika Matriks
        if (monthDiff <= 3) {
            const expKey = expLevel || "Non-Pengalaman"; 
            const outletKey = outletType || "Express";     
            const matrix = SALARY_MATRIX[expKey]?.[outletKey];
            if (matrix && matrix[monthDiff - 1]) {
                salary = matrix[monthDiff - 1];
            }
        }

        return { 
            basic_salary: salary, 
            month_nth: monthDiff,
            original_rate: salary // PENTING: Disimpan untuk hitungan HK
        };
    };

    // 3. SYNC ABSENSI
    const syncAttendanceData = async () => {
        setLoading(true);
        try {
            const { data: attendanceData, error } = await supabase
                .from('attendance_summaries')
                .select(`
                    crew_id, count_h, count_ht, count_s, count_i, count_a, total_late_count, count_off_saturday
                `)
                .eq('month', Number(selectedMonth))
                .eq('year', Number(selectedYear));

            if (error) throw error;
            
            if (!attendanceData || attendanceData.length === 0) {
                toast.warning(`Data absensi bulan ${selectedMonth}/${selectedYear} kosong.`);
                setLoading(false);
                return;
            }

            setPayrollEntries(prev => {
                const updated = { ...prev };
                let syncCount = 0;

                attendanceData.forEach((record: any) => {
                    const cid = record.crew_id; 
                    if (updated[cid]) {
                        const current = updated[cid];
                        
                        // HK = H + HT
                        const workDays = (record.count_h || 0) + (record.count_ht || 0);
                        
                        // Mapping Potongan & Makan
                        const dedSick = (record.count_s || 0) * 50000;
                        const dedPerm = (record.count_i || 0) * 50000;
                        const dedAlpha = (record.count_a || 0) * 50000;
                        
                        const satOff = record.count_off_saturday || 0;
                        let meal = 40000 - (satOff * 10000);
                        if(meal < 0) meal = 0;

                        // PENTING: AUTO HITUNG GAPOK JIKA BULAN KE-1 (PRORATA)
                        let newBasicSalary = current.basic_salary;
                        if (current.month_nth === 1 && current.original_rate > 0) {
                             newBasicSalary = Math.floor((current.original_rate / 26) * workDays);
                        }

                        updated[cid] = {
                            ...current,
                            work_days: workDays,
                            basic_salary: newBasicSalary, // Update Gapok
                            
                            count_sick: record.count_s || 0,
                            count_permission: record.count_i || 0,
                            count_alpha: record.count_a || 0,
                            count_late: record.count_ht || 0, // HT Merah
                            count_saturday_off: satOff,
                            
                            deduction_sick: dedSick,
                            deduction_permission: dedPerm,
                            deduction_alpha: dedAlpha,
                            meal_allowance: meal,
                            
                            attendance_synced: true,
                            notes: (current.notes || "") + (current.month_nth === 1 ? ` [Prorata HK]` : "")
                        };
                        syncCount++;
                    }
                });
                
                toast.success(`Sukses sinkron: ${syncCount} karyawan.`);
                return updated;
            });

        } catch (err: any) {
            toast.error("Gagal sinkron absensi: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // 4. HANDLE INPUT (LOGIKA RELASI HK -> GAPOK)
    const handleInputChange = (crewId: string, field: string, value: number) => {
        setPayrollEntries(prev => {
            const currentEntry = prev[crewId];
            let updatedEntry = { ...currentEntry, [field]: value };

            // === LOGIKA INI YANG MEMBUAT GAPOK BERUBAH SAAT HK DIUBAH ===
            // Syarat: Harus Bulan ke-1 (month_nth === 1)
            if (currentEntry.month_nth === 1 && field === 'work_days') {
                const rate = currentEntry.original_rate || 0; // Pastikan tidak 0
                const prorataSalary = Math.floor((rate / 26) * value);
                
                updatedEntry.basic_salary = prorataSalary;
                updatedEntry.notes = `Prorata Bulan-1 (${value} Hari)`;
            }
            // =============================================================

            if (field === 'count_sick') updatedEntry.deduction_sick = value * 50000;
            if (field === 'count_permission') updatedEntry.deduction_permission = value * 50000;
            if (field === 'count_alpha') updatedEntry.deduction_alpha = value * 50000;
            if (field === 'count_saturday_off') {
                let meal = 40000 - (value * 10000);
                updatedEntry.meal_allowance = meal < 0 ? 0 : meal;
            }

            return { ...prev, [crewId]: updatedEntry };
        });
    };

    // 5. SUBMIT
    const handleSubmit = async () => {
        if (!confirm("Simpan Data Penggajian ini?")) return;
        setLoading(true);

        try {
            const payrollData = crewList.map(crew => {
                const e = payrollEntries[crew.id];
                const total_income = (e.basic_salary??0) + (e.commission??0) + (e.bonus??0) + (e.allowance_other??0) + (e.meal_allowance??0);
                const total_deduction = (e.deduction_kasbon??0) + (e.deduction_sick??0) + (e.deduction_permission??0) + (e.deduction_alpha??0);
                const net_salary = total_income - total_deduction;
                const new_remaining_loan = (e.remaining_loan??0) - (e.deduction_kasbon??0);

                return {
                    crew_id: crew.id,
                    outlet_id: e.outlet_id,
                    period_month: Number(selectedMonth),
                    period_year: Number(selectedYear),
                    
                    base_salary: e.basic_salary,
                    commission_amount: e.commission,
                    meal_allowance: e.meal_allowance,
                    bonus: e.bonus,
                    allowance_other: e.allowance_other,
                    
                    count_sick: e.count_sick,
                    count_permission: e.count_permission,
                    count_alpha: e.count_alpha,
                    count_late: e.count_late,
                    count_saturday_off: e.count_saturday_off,

                    deduction_sick: e.deduction_sick,
                    deduction_permission: e.deduction_permission,
                    deduction_alpha: e.deduction_alpha,
                    deduction_kasbon: e.deduction_kasbon,
                    
                    remaining_loan: new_remaining_loan,
                    total_income: total_income,
                    total_deduction: total_deduction,
                    net_salary: net_salary,
                    
                    status: 'Draft',
                    payment_date: new Date(),
                    notes: e.notes
                };
            });

            const { error } = await supabase.from('payrolls').insert(payrollData);
            if (error) throw error;

            toast.success("Payroll berhasil disimpan!");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h1 className="text-xl font-bold">Input Penggajian</h1>
                    <p className="text-sm text-gray-500">Hitung gaji & potongan periode ini.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => (
                                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
                    </Select>
                    
                    <Button variant="outline" size="sm" onClick={syncAttendanceData} disabled={loading} className="ml-2">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Absen
                    </Button>
                </div>
            </div>

            <Card className="border-t-4 border-blue-600 shadow-md">
                <CardHeader className="py-3 bg-gray-50">
                    <CardTitle className="text-sm font-medium">Form Input Gaji</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {/* TABLE LEBAR (Scroll Horizontal) */}
                    <Table className="min-w-[2400px]">
                        <TableHeader>
                            <TableRow className="bg-gray-100 text-[11px] uppercase tracking-wide">
                                <TableHead className="w-[250px] sticky left-0 z-20 bg-gray-100 shadow-sm border-r">Nama Karyawan</TableHead>
                                <TableHead className="w-[80px] text-center bg-blue-50 text-blue-700 font-bold border-r">HK</TableHead>
                                <TableHead className="w-[160px] pl-4">Gaji Pokok</TableHead>
                                <TableHead className="w-[130px]">Persenan</TableHead>
                                <TableHead className="w-[130px]">Bonus</TableHead>
                                <TableHead className="w-[130px]">Tunjangan</TableHead>
                                <TableHead className="w-[140px] bg-green-50 text-green-700 border-l border-r">Uang Makan (+)</TableHead>
                                <TableHead className="w-[90px] bg-red-50 text-red-600 text-center">Sakit (-)</TableHead>
                                <TableHead className="w-[90px] bg-red-50 text-red-600 text-center">Izin (-)</TableHead>
                                <TableHead className="w-[90px] bg-red-50 text-red-600 text-center">Alpa (-)</TableHead>
                                <TableHead className="w-[60px] text-center text-red-600 font-bold bg-red-100 border-l border-r">HT</TableHead>
                                <TableHead className="w-[140px] text-red-600 border-r">Kasbon (-)</TableHead>
                                <TableHead className="w-[160px] text-right font-bold text-blue-700 bg-blue-50 border-r">Total Gaji</TableHead>
                                <TableHead className="w-[160px] text-right font-black text-green-700 bg-green-50">DITERIMA (NET)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={14} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                            ) : crewList.length === 0 ? (
                                <TableRow><TableCell colSpan={14} className="text-center h-24 text-muted-foreground">Tidak ada data crew.</TableCell></TableRow>
                            ) : (
                                crewList.map((crew) => {
                                    const e = payrollEntries[crew.id] || {};
                                    
                                    const totalIncome = (e.basic_salary??0) + (e.commission??0) + (e.bonus??0) + (e.allowance_other??0) + (e.meal_allowance??0);
                                    const deductAbsen = (e.deduction_sick??0) + (e.deduction_permission??0) + (e.deduction_alpha??0);
                                    const totalDeduct = deductAbsen + (e.deduction_kasbon??0);
                                    const net = totalIncome - totalDeduct;

                                    return (
                                        <TableRow key={crew.id} className="hover:bg-blue-50/10 text-xs">
                                            {/* NAMA (STICKY) */}
                                            <TableCell className="sticky left-0 z-10 bg-white border-r shadow-sm">
                                                <div className="font-bold text-sm truncate">{crew.full_name}</div>
                                                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    {crew.outlets?.name} <span className="text-gray-300">|</span> Bln-{e.month_nth??0}
                                                </div>
                                                {(e.remaining_loan??0) > 0 && (
                                                    <div className="text-[10px] text-red-600 font-bold mt-1 bg-red-50 inline-block px-1 rounded">
                                                        Sisa Hutang: {(e.remaining_loan??0).toLocaleString()}
                                                    </div>
                                                )}
                                                {/* Indikator Prorata */}
                                                {e.month_nth === 1 && (
                                                    <Badge className="ml-1 text-[8px] h-3 px-1 bg-yellow-100 text-yellow-800">Prorata</Badge>
                                                )}
                                            </TableCell>
                                            
                                            {/* HK (TRIGGER PRORATA) */}
                                            <TableCell className="bg-blue-50/20 text-center border-r">
                                                <Input 
                                                    type="number" className="h-8 w-full text-center font-bold text-blue-700 bg-white" 
                                                    value={e.work_days ?? 0} 
                                                    onChange={(ev) => handleInputChange(crew.id, 'work_days', Number(ev.target.value))}
                                                />
                                            </TableCell>

                                            {/* GAPOK */}
                                            <TableCell className="pl-4">
                                                <Input type="number" className="h-8 bg-gray-50 font-medium" 
                                                    value={e.basic_salary ?? 0} 
                                                    onChange={(ev) => handleInputChange(crew.id, 'basic_salary', Number(ev.target.value))}
                                                />
                                            </TableCell>

                                            {/* INPUTS LAIN */}
                                            <TableCell><Input type="number" className="h-8" placeholder="0" value={e.commission ?? 0} onChange={(ev) => handleInputChange(crew.id, 'commission', Number(ev.target.value))}/></TableCell>
                                            <TableCell><Input type="number" className="h-8" placeholder="0" value={e.bonus ?? 0} onChange={(ev) => handleInputChange(crew.id, 'bonus', Number(ev.target.value))}/></TableCell>
                                            <TableCell><Input type="number" className="h-8" placeholder="0" value={e.allowance_other ?? 0} onChange={(ev) => handleInputChange(crew.id, 'allowance_other', Number(ev.target.value))}/></TableCell>

                                            {/* UANG MAKAN */}
                                            <TableCell className="bg-green-50/30 border-l border-r">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[9px] text-gray-500">Off Sbt</span>
                                                    <span className="text-[10px] font-bold text-gray-700">{e.count_saturday_off ?? 0}</span>
                                                </div>
                                                <div className="font-bold text-green-700 text-sm">{(e.meal_allowance??0).toLocaleString()}</div>
                                            </TableCell>

                                            {/* POTONGAN */}
                                            <TableCell className="bg-red-50/30 px-1">
                                                <Input type="number" className="h-6 w-full text-center text-[10px] mb-1" placeholder="0" value={e.count_sick ?? 0} onChange={(ev) => handleInputChange(crew.id, 'count_sick', Number(ev.target.value))}/>
                                                <div className="text-[9px] text-red-600 text-center font-semibold">{(e.deduction_sick??0).toLocaleString()}</div>
                                            </TableCell>
                                            <TableCell className="bg-red-50/30 px-1">
                                                <Input type="number" className="h-6 w-full text-center text-[10px] mb-1" placeholder="0" value={e.count_permission ?? 0} onChange={(ev) => handleInputChange(crew.id, 'count_permission', Number(ev.target.value))}/>
                                                <div className="text-[9px] text-red-600 text-center font-semibold">{(e.deduction_permission??0).toLocaleString()}</div>
                                            </TableCell>
                                            <TableCell className="bg-red-50/30 px-1">
                                                <Input type="number" className="h-6 w-full text-center text-[10px] mb-1" placeholder="0" value={e.count_alpha ?? 0} onChange={(ev) => handleInputChange(crew.id, 'count_alpha', Number(ev.target.value))}/>
                                                <div className="text-[9px] text-red-600 text-center font-semibold">{(e.deduction_alpha??0).toLocaleString()}</div>
                                            </TableCell>

                                            {/* HT (MERAH) */}
                                            <TableCell className="text-center bg-red-100/50 border-l border-r">
                                                <div className={`font-black text-lg ${(e.count_late??0) > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                                                    {e.count_late ?? 0}
                                                </div>
                                            </TableCell>

                                            {/* KASBON */}
                                            <TableCell className="border-r">
                                                <Input 
                                                    type="number" className="h-8 text-red-700 font-bold bg-red-50 border-red-200" 
                                                    value={e.deduction_kasbon ?? 0}
                                                    placeholder="0"
                                                    onChange={(ev) => handleInputChange(crew.id, 'deduction_kasbon', Number(ev.target.value))}
                                                />
                                            </TableCell>

                                            {/* TOTALS */}
                                            <TableCell className="text-right font-bold text-blue-700 bg-blue-50/50 border-r text-sm">
                                                {totalIncome.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-right font-black text-green-700 bg-green-100/50 text-base">
                                                {net.toLocaleString('id-ID')}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end mt-6 pb-10">
                <Button onClick={handleSubmit} disabled={loading} className="bg-blue-700 hover:bg-blue-800 px-8 py-6 text-lg shadow-xl">
                    {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-5 w-5"/>}
                    Simpan Payroll
                </Button>
            </div>
        </div>
    );
}