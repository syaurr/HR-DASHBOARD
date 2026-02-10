"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileSignature, Save } from "lucide-react";
import { toast } from "sonner";

type CrewContract = {
  id: string; // crew_id
  full_name: string;
  role: string;
  outlet_name: string;
  contract_id?: string;
  base_salary: number;
  daily_meal_allowance: number; // Tetap ada di DB walau logic Sabtu dipotong fix
  contract_type: string;
  start_date: string;
  end_date: string;
};

export default function ContractsPage() {
  const [crews, setCrews] = useState<CrewContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedCrew, setSelectedCrew] = useState<CrewContract | null>(null);
  const [formData, setFormData] = useState({
    base_salary: "",
    contract_type: "probation",
    start_date: "",
    end_date: ""
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    // Join Crew dengan Kontrak Aktif
    const { data: crewData } = await supabase
      .from("crew")
      .select(`
        id, full_name, role, outlets(name),
        crew_contracts(id, base_salary, contract_type, start_date, end_date)
      `)
      .eq("is_active", true)
      .order("full_name");

    if (crewData) {
      const formatted = crewData.map((c: any) => {
        // Ambil kontrak aktif terakhir (jika ada multiple, ambil index 0)
        const contract = c.crew_contracts && c.crew_contracts.length > 0 ? c.crew_contracts[0] : null;
        return {
          id: c.id,
          full_name: c.full_name,
          role: c.role,
          outlet_name: c.outlets?.name || "-",
          contract_id: contract?.id,
          base_salary: contract?.base_salary || 0,
          contract_type: contract?.contract_type || "-",
          start_date: contract?.start_date || "-",
          end_date: contract?.end_date || "-",
          daily_meal_allowance: 0 // Tidak terlalu dipake di UI baru, backend logic aja
        };
      });
      setCrews(formatted);
    }
    setLoading(false);
  };

  const handleEdit = (crew: CrewContract) => {
    setSelectedCrew(crew);
    setFormData({
      base_salary: crew.base_salary ? crew.base_salary.toString() : "0",
      contract_type: crew.contract_type !== "-" ? crew.contract_type : "probation",
      start_date: crew.start_date !== "-" ? crew.start_date : new Date().toISOString().split('T')[0],
      end_date: crew.end_date !== "-" ? crew.end_date : ""
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCrew) return;
    setSaving(true);
    try {
      // 1. Nonaktifkan kontrak lama
      if (selectedCrew.contract_id) {
        await supabase.from("crew_contracts").update({ is_active: false }).eq("id", selectedCrew.contract_id);
      }

      // 2. Insert Kontrak Baru
      const { error } = await supabase.from("crew_contracts").insert({
        crew_id: selectedCrew.id,
        base_salary: parseFloat(formData.base_salary),
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        experience_level: 'non_experienced', // Default value agar tidak error not null
        daily_meal_allowance: 0, // Default
        is_active: true
      });

      if (error) throw error;
      toast.success("Kontrak diperbarui!");
      setIsDialogOpen(false);
      fetchContracts();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", {style:"currency", currency:"IDR", minimumFractionDigits:0}).format(n);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Data Kontrak Karyawan</h1>
      <p className="text-muted-foreground">Pastikan data Gaji Pokok sesuai dengan PDF kontrak yang dicetak.</p>

      <div className="rounded border bg-white shadow overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Outlet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mulai Kontrak</TableHead>
              <TableHead>Akhir Kontrak</TableHead>
              <TableHead>Gaji Pokok</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center h-24">Loading...</TableCell></TableRow> :
            crews.map((crew) => (
              <TableRow key={crew.id}>
                <TableCell className="font-medium">{crew.full_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{crew.outlet_name}</TableCell>
                <TableCell>
                    {crew.contract_type === 'probation' && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Probation</span>}
                    {crew.contract_type === 'permanent' && <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Tetap</span>}
                    {crew.contract_type === '-' && <span className="text-red-500 text-xs">Belum set</span>}
                </TableCell>
                <TableCell>{crew.start_date}</TableCell>
                <TableCell>{crew.end_date}</TableCell>
                <TableCell className="font-bold">{formatRupiah(crew.base_salary)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(crew)}>
                    <FileSignature className="mr-2 h-4 w-4"/> Update
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL EDIT */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Update Kontrak: {selectedCrew?.full_name}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label>Gaji Pokok (Sesuai PDF Kontrak)</Label>
                    <Input type="number" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: e.target.value})}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tipe Kontrak</Label>
                        <Select value={formData.contract_type} onValueChange={v => setFormData({...formData, contract_type: v})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="probation">Probation (PKWTTP)</SelectItem>
                                <SelectItem value="permanent">Tetap</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Tanggal Mulai</Label>
                        <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})}/>
                    </div>
                    <div className="space-y-2">
                        <Label>Tanggal Akhir</Label>
                        <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})}/>
                        <p className="text-[10px] text-muted-foreground">Kosongkan jika pegawai tetap</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : "Simpan"}</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}