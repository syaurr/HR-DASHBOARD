"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Upload, Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

type AttendanceData = {
  crew_id: string;
  crew_name: string;
  outlet_name: string;
  // Counters
  h: number;
  ht: number;
  s: number;
  i: number;
  a: number;
  c: number;
  off: number;
  off_saturday: number; // (-)
  has_sick_letter: boolean; // Manual Checkbox
};

export default function AttendancePage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [data, setData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Periods
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

  // 2. Load Data Existing saat Periode Dipilih
  useEffect(() => {
    if (!selectedPeriodId) return;
    fetchAttendance();
  }, [selectedPeriodId]);

  const fetchAttendance = async () => {
    setLoading(true);
    // Ambil Crew Aktif
    const { data: crews } = await supabase
      .from("crew")
      .select("id, full_name, outlets(name)")
      .eq("is_active", true)
      .order("full_name");

    // Ambil Data Absen Tersimpan
    const { data: existing } = await supabase
      .from("attendance_summaries")
      .select("*")
      .eq("period_id", selectedPeriodId);

    if (crews) {
      const formatted = crews.map(c => {
        const saved = existing?.find(e => e.crew_id === c.id);
        return {
          crew_id: c.id,
          crew_name: c.full_name,
          outlet_name: c.outlets?.name || "-",
          h: saved?.count_h || 0,
          ht: saved?.count_ht || 0,
          s: saved?.count_s || 0,
          i: saved?.count_i || 0,
          a: saved?.count_a || 0,
          c: saved?.count_c || 0,
          off: saved?.count_off || 0,
          off_saturday: saved?.count_off_saturday || 0,
          has_sick_letter: saved?.has_sick_letter || false,
        };
      });
      setData(formatted);
    }
    setLoading(false);
  };

  // 3. Logic CSV Parsing (Fuzzy Match & Counting)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rows = results.data;
        const updatedData = [...data];
        let matchCount = 0;

        // Loop Crew di Database (bukan loop CSV, biar urutan tabel ga berubah)
        updatedData.forEach((crew, index) => {
           // Fuzzy Match: Ambil 2 kata pertama nama crew
           const crewNameParts = crew.crew_name.toLowerCase().split(" ").slice(0, 2).join(" ");
           
           // Cari di CSV
           const csvRow = rows.find((r: any) => 
              r['Nama'] && r['Nama'].toLowerCase().includes(crewNameParts)
           );

           if (csvRow) {
             matchCount++;
             let counts = { h:0, ht:0, s:0, i:0, a:0, c:0, off:0, off_saturday:0 };
             
             Object.values(csvRow).forEach((val: any) => {
                const code = String(val).toUpperCase().trim();
                if(code === 'H') counts.h++;
                else if(code === 'HT') counts.ht++;
                else if(code === 'S') counts.s++;
                else if(code === 'I') counts.i++;
                else if(code === 'A') counts.a++;
                else if(code === 'C') counts.c++;
                else if(code === 'OFF') counts.off++;
                else if(code === '(-)') counts.off_saturday++;
             });

             updatedData[index] = { ...crew, ...counts };
           }
        });

        setData(updatedData);
        toast.success(`Berhasil mencocokkan ${matchCount} karyawan dari CSV.`);
      }
    });
  };

  // 4. Save to Database
  const handleSave = async () => {
    if (!selectedPeriodId) return;
    setSaving(true);
    try {
      const payload = data.map(d => ({
        period_id: selectedPeriodId,
        crew_id: d.crew_id,
        // Mapping kolom database baru
        count_h: d.h,
        count_ht: d.ht,
        count_s: d.s,
        count_i: d.i,
        count_a: d.a,
        count_c: d.c,
        count_off: d.off,
        count_off_saturday: d.off_saturday,
        has_sick_letter: d.has_sick_letter,
        
        // Kolom legacy (total days present) untuk kompatibilitas
        total_days_present: d.h + d.ht, 
        total_late_count: d.ht,
        total_sick: d.s,
        total_permission: d.i,
        total_alpha: d.a
      }));

      const { error } = await supabase
        .from("attendance_summaries")
        .upsert(payload, { onConflict: "period_id, crew_id" });

      if (error) throw error;
      toast.success("Data absensi tersimpan!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Input Absensi (CSV)</h1>
          <p className="text-muted-foreground">Upload absensi & tandai surat sakit di sini.</p>
        </div>
        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pilih Periode"/></SelectTrigger>
          <SelectContent>{periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Toolbar Upload */}
      <div className="bg-white p-4 border rounded shadow-sm flex items-center gap-4">
        <div className="flex-1">
           <label className="text-sm font-semibold mb-1 block">Upload CSV Absensi</label>
           <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} />
           <p className="text-[10px] text-muted-foreground mt-1">Format: Nama, 1, 2, 3... (Isi kode H, HT, S, I, A, OFF, C, (-))</p>
        </div>
        <div>
           <Button onClick={handleSave} disabled={saving} className="h-10">
              {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>} Simpan Data
           </Button>
        </div>
      </div>

      {/* Tabel Absensi */}
      <div className="rounded border bg-white overflow-hidden shadow">
        <Table className="text-xs">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead className="text-center w-10 bg-green-50">H</TableHead>
              <TableHead className="text-center w-10 bg-red-50 text-red-700 font-bold">HT</TableHead>
              <TableHead className="text-center w-10 bg-blue-50">S</TableHead>
              <TableHead className="text-center w-10 bg-orange-50">I</TableHead>
              <TableHead className="text-center w-10 bg-red-100 text-red-700">A</TableHead>
              <TableHead className="text-center w-10">C</TableHead>
              <TableHead className="text-center w-10">OFF</TableHead>
              <TableHead className="text-center w-10 bg-gray-100">(-)</TableHead>
              <TableHead className="w-[150px] text-center">Opsi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={10} className="text-center h-24">Loading...</TableCell></TableRow> :
            data.map((row, idx) => (
              <TableRow key={row.crew_id}>
                <TableCell>
                  <div className="font-semibold">{row.crew_name}</div>
                  <div className="text-[10px] text-muted-foreground">{row.outlet_name}</div>
                </TableCell>
                <TableCell className="text-center">{row.h}</TableCell>
                <TableCell className="text-center font-bold text-red-600">{row.ht}</TableCell>
                <TableCell className="text-center">{row.s}</TableCell>
                <TableCell className="text-center">{row.i}</TableCell>
                <TableCell className="text-center font-bold text-red-600">{row.a}</TableCell>
                <TableCell className="text-center">{row.c}</TableCell>
                <TableCell className="text-center">{row.off}</TableCell>
                <TableCell className="text-center font-bold">{row.off_saturday}</TableCell>
                
                {/* Checkbox Surat Sakit */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Checkbox 
                        id={`sick-${row.crew_id}`}
                        checked={row.has_sick_letter}
                        onCheckedChange={(checked) => {
                            const newData = [...data];
                            newData[idx].has_sick_letter = checked === true;
                            setData(newData);
                        }}
                    />
                    <label htmlFor={`sick-${row.crew_id}`} className="cursor-pointer select-none">
                        {row.has_sick_letter ? <Badge className="bg-green-600 hover:bg-green-700">Ada Surat</Badge> : <span className="text-muted-foreground">Tidak Ada</span>}
                    </label>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}