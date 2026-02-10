'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Save, RefreshCw, Settings, Info, Wallet, Calculator } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

    const initData = async () => {
        setLoading(true);
        try {
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
                    ...calculation,
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
                    notes: loanInfo ? `Potong Kasbon Otomatis` : ''
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

    const calculateBaseSalary = (joinDateStr: string, expLevel: string, outletType: string, contractSalary: number) => {
        if (!joinDateStr) return { basic_salary: 0, month_nth: 0, original_rate: 0 };
        const joinDate = new Date(joinDateStr);
        const payrollDate = new Date(Number(selectedYear), Number(selectedMonth) - 1, 25);
        let monthDiff = (payrollDate.getFullYear() - joinDate.getFullYear()) * 12 + (payrollDate.getMonth() - joinDate.getMonth()) + 1;
        if (monthDiff < 1) monthDiff = 1; 
        let salary = contractSalary || 0;

        if (monthDiff <= 3) {
            const expKey = expLevel || "Non-Pengalaman"; 
            const outletKey = outletType || "Express";     
            const matrix = SALARY_MATRIX[expKey]?.[outletKey];
            if (matrix && matrix[monthDiff - 1]) {
                salary = matrix[monthDiff - 1];
            }
        }
        return { basic_salary: salary, month_nth: monthDiff, original_rate: salary };
    };

    const syncAttendanceData = async () => {
        setLoading(true);
        try {
            const { data: attendanceData, error } = await supabase
                .from('attendance_summaries')
                .select(`crew_id, count_h, count_ht, count_s, count_i, count_a, total_late_count, count_off_saturday`)
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
                attendanceData.forEach((record: any) => {
                    const cid = record.crew_id; 
                    if (updated[cid]) {
                        const current = updated[cid];
                        const workDays = (record.count_h || 0) + (record.count_ht || 0);
                        const satOff = record.count_off_saturday || 0;
                        let meal = 40000 - (satOff * 10000);
                        if(meal < 0) meal = 0;

                        let newBasicSalary = current.basic_salary;
                        if (current.month_nth === 1 && current.original_rate > 0) {
                             newBasicSalary = Math.floor((current.original_rate / 26) * workDays);
                        }

                        updated[cid] = {
                            ...current,
                            work_days: workDays,
                            basic_salary: newBasicSalary,
                            count_sick: record.count_s || 0,
                            count_permission: record.count_i || 0,
                            count_alpha: record.count_a || 0,
                            count_late: record.count_ht || 0,
                            count_saturday_off: satOff,
                            deduction_sick: (record.count_s || 0) * 50000,
                            deduction_permission: (record.count_i || 0) * 50000,
                            deduction_alpha: (record.count_a || 0) * 50000,
                            meal_allowance: meal,
                            notes: (current.notes || "") + (current.month_nth === 1 ? ` [Prorata Absensi]` : "")
                        };
                    }
                });
                toast.success(`Sinkronisasi selesai.`);
                return updated;
            });
        } catch (err: any) {
            toast.error("Gagal sinkron: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (crewId: string, field: string, value: number) => {
        setPayrollEntries(prev => {
            const currentEntry = prev[crewId];
            let updatedEntry = { ...currentEntry, [field]: value };

            if (currentEntry.month_nth === 1 && field === 'work_days') {
                updatedEntry.basic_salary = Math.floor((currentEntry.original_rate / 26) * value);
            }

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

    const handleSubmit = async () => {
        if (!confirm("Simpan Data Penggajian ini?")) return;
        setLoading(true);
        try {
            const payrollData = crewList.map(crew => {
                const e = payrollEntries[crew.id];
                const total_income = (e.basic_salary??0) + (e.commission??0) + (e.bonus??0) + (e.allowance_other??0) + (e.meal_allowance??0);
                const total_deduction = (e.deduction_kasbon??0) + (e.deduction_sick??0) + (e.deduction_permission??0) + (e.deduction_alpha??0);
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
                    remaining_loan: (e.remaining_loan??0) - (e.deduction_kasbon??0),
                    total_income: total_income,
                    total_deduction: total_deduction,
                    net_salary: total_income - total_deduction,
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
        <div className="space-y-6 font-poppins">
            {/* HEADER AREA */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-[#022020]">Pemrosesan Payroll</h1>
                    <p className="text-sm text-gray-500">Kelola pendapatan dan potongan kru Balista.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl border">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[110px] border-none bg-transparent shadow-none font-semibold focus:ring-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[85px] border-none bg-transparent shadow-none font-semibold focus:ring-0"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" onClick={syncAttendanceData} disabled={loading} className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50">
                        <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Sinkron Absensi
                    </Button>
                </div>
            </div>

            {/* MAIN TABLE CARD */}
            <Card className="rounded-2xl shadow-xl border-none overflow-hidden bg-white">
                <CardHeader className="bg-[#033f3f] text-white py-4 px-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Calculator className="w-4 h-4" /> Daftar Kalkulasi Gaji Karyawan
                    </CardTitle>
                    <Badge variant="outline" className="text-white border-white/30 bg-white/10 uppercase text-[10px]">Periode {selectedMonth}/{selectedYear}</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[1700px]">
                            <TableHeader>
                                <TableRow className="bg-gray-50/80 border-b">
                                    <TableHead className="w-[280px] sticky left-0 z-30 bg-gray-50 font-bold border-r">Informasi Karyawan</TableHead>
                                    <TableHead className="w-[100px] text-center font-bold bg-blue-50/50 text-blue-800">HK</TableHead>
                                    <TableHead className="w-[160px] font-bold">Gaji Pokok</TableHead>
                                    <TableHead className="w-[130px] font-bold">Bonus/Komp</TableHead>
                                    <TableHead className="w-[150px] font-bold text-green-700 bg-green-50/30 border-l border-r">Uang Makan (+)</TableHead>
                                    <TableHead className="w-[220px] font-bold text-red-700 bg-red-50/30 text-center">Total Potongan (-)</TableHead>
                                    <TableHead className="w-[180px] text-right font-bold text-blue-900 bg-blue-50/30 border-l">Bruto (Total Gaji)</TableHead>
                                    <TableHead className="w-[200px] text-right font-black text-emerald-800 bg-emerald-50">Gaji Bersih (NET)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} className="text-center h-40"><Loader2 className="animate-spin mx-auto text-[#033f3f]"/></TableCell></TableRow>
                                ) : crewList.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center h-40 text-muted-foreground italic">Belum ada data kru untuk periode ini.</TableCell></TableRow>
                                ) : (
                                    crewList.map((crew) => {
                                        const e = payrollEntries[crew.id] || {};
                                        const totalIncome = (e.basic_salary??0) + (e.commission??0) + (e.bonus??0) + (e.allowance_other??0) + (e.meal_allowance??0);
                                        const deductAbsen = (e.deduction_sick??0) + (e.deduction_permission??0) + (e.deduction_alpha??0);
                                        const totalDeduct = deductAbsen + (e.deduction_kasbon??0);
                                        const net = totalIncome - totalDeduct;

                                        return (
                                            <TableRow key={crew.id} className="hover:bg-gray-50 transition-colors group">
                                                {/* KARYAWAN (STICKY) */}
                                                <TableCell className="sticky left-0 z-20 bg-white border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-bold text-[#022020] truncate text-sm">{crew.full_name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded leading-none italic">{crew.outlets?.name}</span>
                                                            <span className="text-[10px] text-blue-600 font-semibold uppercase">Bulan Ke-{e.month_nth??0}</span>
                                                        </div>
                                                        {e.month_nth === 1 && <div className="text-[9px] text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-2 py-0.5 rounded-full w-fit mt-1 border border-amber-100"><Info className="w-2.5 h-2.5" /> Prorata Gaji Aktif</div>}
                                                    </div>
                                                </TableCell>

                                                {/* HK */}
                                                <TableCell className="bg-blue-50/20 text-center">
                                                    <Input type="number" className="h-9 w-16 mx-auto text-center font-bold text-blue-800 border-blue-100 focus:ring-blue-500 rounded-lg" value={e.work_days ?? 0} onChange={(ev) => handleInputChange(crew.id, 'work_days', Number(ev.target.value))} />
                                                </TableCell>

                                                {/* GAPOK */}
                                                <TableCell>
                                                    <div className="text-[10px] text-gray-400 mb-1 leading-none">Nominal Base</div>
                                                    <Input type="number" className="h-9 font-semibold text-gray-700 border-gray-100" value={e.basic_salary ?? 0} onChange={(ev) => handleInputChange(crew.id, 'basic_salary', Number(ev.target.value))} />
                                                </TableCell>

                                                {/* BONUS */}
                                                <TableCell>
                                                    <div className="space-y-1.5">
                                                        <Input type="number" placeholder="Komisi" className="h-8 text-[11px]" value={e.commission ?? 0} onChange={(ev) => handleInputChange(crew.id, 'commission', Number(ev.target.value))} />
                                                        <Input type="number" placeholder="Bonus" className="h-8 text-[11px]" value={e.bonus ?? 0} onChange={(ev) => handleInputChange(crew.id, 'bonus', Number(ev.target.value))} />
                                                    </div>
                                                </TableCell>

                                                {/* UANG MAKAN */}
                                                <TableCell className="bg-green-50/20 border-l border-r">
                                                    <div className="flex items-center justify-between mb-1 px-1">
                                                        <span className="text-[9px] text-gray-500 uppercase font-medium">Off Sabtu</span>
                                                        <span className="text-[11px] font-bold text-green-700">{e.count_saturday_off ?? 0}x</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-green-800 text-center py-1 bg-white rounded-lg border border-green-100 shadow-sm">
                                                        {e.meal_allowance?.toLocaleString('id-ID')}
                                                    </div>
                                                </TableCell>

                                                {/* TOTAL POTONGAN (COMBINED) */}
                                                <TableCell className="bg-red-50/20 border-r p-3">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="grid grid-cols-2 gap-1 px-1">
                                                            <div className="text-[9px] bg-white border border-red-100 text-center py-0.5 rounded leading-none">SIA: <span className="font-bold">{e.count_sick+e.count_permission+e.count_alpha}d</span></div>
                                                            <div className="text-[9px] bg-white border border-red-100 text-center py-0.5 rounded leading-none">HT: <span className="font-bold text-red-600">{e.count_late}</span></div>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="text-sm font-extrabold text-red-700 leading-none">
                                                                Rp{totalDeduct.toLocaleString('id-ID')}
                                                            </div>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-red-200 bg-white hover:bg-red-100 transition-all shadow-sm group-hover:scale-110">
                                                                        <Settings className="h-3.5 w-3.5 text-red-600" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-64 p-4 shadow-2xl rounded-xl border-red-100">
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2 border-b pb-2 mb-2">
                                                                            <Calculator className="w-4 h-4 text-red-600" />
                                                                            <h4 className="font-bold text-sm text-red-700 uppercase">Input Potongan</h4>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                                                                            {['count_sick', 'count_permission', 'count_alpha'].map((f) => (
                                                                                <div key={f} className="space-y-1">
                                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">{f.split('_')[1]}</label>
                                                                                    <Input type="number" className="h-8 text-xs font-bold" value={e[f]} onChange={(ev)=>handleInputChange(crew.id, f, Number(ev.target.value))} />
                                                                                </div>
                                                                            ))}
                                                                            <div className="space-y-1">
                                                                                <label className="text-[10px] font-bold text-gray-400 uppercase">HT (Merah)</label>
                                                                                <Input type="number" className="h-8 text-xs font-bold bg-red-50" value={e.count_late} onChange={(ev)=>handleInputChange(crew.id, 'count_late', Number(ev.target.value))} />
                                                                            </div>
                                                                        </div>
                                                                        <div className="pt-2 border-t mt-2">
                                                                            <label className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1"><Wallet className="w-3 h-3" /> Kasbon/Cicilan</label>
                                                                            <Input type="number" className="h-9 mt-1 font-bold text-red-700 border-red-200 bg-red-50/50" value={e.deduction_kasbon} onChange={(ev)=>handleInputChange(crew.id, 'deduction_kasbon', Number(ev.target.value))} />
                                                                        </div>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* TOTALS */}
                                                <TableCell className="text-right bg-blue-50/10 border-l font-bold text-blue-900 text-sm italic">
                                                    {totalIncome.toLocaleString('id-ID')}
                                                </TableCell>
                                                <TableCell className="text-right bg-emerald-50/50">
                                                    <div className="text-[9px] text-emerald-600 font-bold uppercase leading-none mb-1">Take Home Pay</div>
                                                    <div className="text-lg font-black text-emerald-800">
                                                        {net.toLocaleString('id-ID')}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* ACTION BUTTON */}
            <div className="flex justify-end pt-4 pb-12">
                <Button onClick={handleSubmit} disabled={loading} className="bg-[#033f3f] hover:bg-[#022020] text-white px-10 py-7 text-lg font-bold rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-3">
                    {loading ? <Loader2 className="animate-spin w-6 h-6"/> : <Save className="w-6 h-6"/>}
                    Finalisasi & Simpan Gaji
                </Button>
            </div>
        </div>
    );
}