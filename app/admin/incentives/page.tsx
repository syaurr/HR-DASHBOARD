"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trophy, Pencil, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

// Tipe Data
type IncentiveRule = {
  id: number;
  rank_position: number;
  bonus_amount: number;
  is_active: boolean;
};

export default function IncentivesPage() {
  const [rules, setRules] = useState<IncentiveRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal Form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{ id?: number; rank: string; amount: string }>({
    rank: "",
    amount: "",
  });
  const [saving, setSaving] = useState(false);

  // 1. Fetch Data Rules
  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ranking_incentive_rules")
      .select("*")
      .order("rank_position", { ascending: true });

    if (error) {
      toast.error("Gagal memuat data");
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // 2. Handle Simpan (Add / Edit)
  const handleSave = async () => {
    setSaving(true);
    try {
        const payload = {
            rank_position: parseInt(formData.rank),
            bonus_amount: parseInt(formData.amount),
        };

        if (formData.id) {
            // MODE EDIT
            const { error } = await supabase
                .from("ranking_incentive_rules")
                .update(payload)
                .eq("id", formData.id);
            if (error) throw error;
            toast.success("Aturan berhasil diperbarui");
        } else {
            // MODE TAMBAH BARU
            const { error } = await supabase
                .from("ranking_incentive_rules")
                .insert(payload);
            
            // Handle error duplicate key (jika Rank 1 sudah ada, gaboleh input lagi)
            if (error?.code === "23505") {
                throw new Error("Ranking ini sudah ada aturannya. Edit yang lama.");
            }
            if (error) throw error;
            toast.success("Aturan baru ditambahkan");
        }

        setIsDialogOpen(false);
        fetchRules(); // Refresh table
    } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
    } finally {
        setSaving(false);
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus aturan ini?")) return;

    const { error } = await supabase
        .from("ranking_incentive_rules")
        .delete()
        .eq("id", id);

    if (error) {
        toast.error("Gagal menghapus");
    } else {
        toast.success("Dihapus");
        fetchRules();
    }
  };

  // Helper Buka Modal Edit
  const openEdit = (rule: IncentiveRule) => {
    setFormData({
        id: rule.id,
        rank: rule.rank_position.toString(),
        amount: rule.bonus_amount.toString()
    });
    setIsDialogOpen(true);
  };

  // Helper Buka Modal Baru
  const openNew = () => {
    setFormData({ rank: "", amount: "" });
    setIsDialogOpen(true);
  };

  // Helper Format Rupiah
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="text-yellow-500 h-6 w-6" />
            Aturan Insentif Ranking
          </h1>
          <p className="text-muted-foreground">
            Tentukan nominal bonus untuk setiap peringkat karyawan terbaik bulanan.
          </p>
        </div>
        <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Aturan
        </Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[100px] text-center">Peringkat</TableHead>
              <TableHead>Nominal Bonus</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow>
            ) : rules.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Belum ada aturan insentif.</TableCell></TableRow>
            ) : (
                rules.map((rule) => (
                    <TableRow key={rule.id}>
                        <TableCell className="text-center font-bold text-lg">
                            #{rule.rank_position}
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold text-base">
                            {formatRupiah(rule.bonus_amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                           Bonus Kinerja untuk Ranking {rule.rank_position}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                                    <Pencil className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- MODAL FORM --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{formData.id ? "Edit Aturan" : "Tambah Aturan Baru"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label>Posisi Ranking</Label>
                <Input 
                    type="number" 
                    placeholder="Contoh: 1 (untuk Juara 1)" 
                    value={formData.rank}
                    onChange={(e) => setFormData({...formData, rank: e.target.value})}
                    disabled={!!formData.id} // Tidak boleh ubah rank saat edit, hapus buat baru aja
                />
                <p className="text-xs text-muted-foreground">Posisi ranking harus unik (tidak boleh ganda).</p>
            </div>
            
            <div className="space-y-2">
                <Label>Nominal Bonus (Rp)</Label>
                <Input 
                    type="number" 
                    placeholder="Contoh: 500000" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>}
                Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}