"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

export default function AdminCashAdvances() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Admin Processing Form
  const [processForm, setProcessForm] = useState({
    approved_amount: 0,
    approved_deduction_amount: 0,
    previous_loan_balance_system: 0, // Admin input/check dari payroll
    status: 'approved' // pending, approved, adjusted, declined
  });

  // State Kalkulasi Otomatis
  const [calculatedRemaining, setCalculatedRemaining] = useState(0);

  useEffect(() => {
    fetchRequests();
  }, []);

  // Kalkulasi Real-time saat input berubah
  useEffect(() => {
      // Rumus: Sisa Awal (System) + Kasbon Baru (Approved) - Potongan (Approved)
      const sisaAwal = Number(processForm.previous_loan_balance_system) || 0;
      const kasbonBaru = Number(processForm.approved_amount) || 0;
      const potongan = Number(processForm.approved_deduction_amount) || 0;
      
      setCalculatedRemaining(sisaAwal + kasbonBaru - potongan);
  }, [processForm]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cash_advances")
      .select(`
        *,
        crew:crew_id (full_name, email, outlets(name))
      `)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  const openApproval = async (req: any) => {
    setSelectedReq(req);
    
    // TODO: Di sini idealnya fetch 'previous_loan_balance_system' dari tabel Payroll terakhir crew ini
    // Untuk sekarang kita set 0 atau ambil dari user input sebagai placeholder jika belum ada sistem payroll
    const simulatedSystemBalance = 0; // Nanti ganti dengan fetch real dari DB Payroll

    setProcessForm({
      approved_amount: req.request_amount, 
      approved_deduction_amount: req.request_deduction_amount,
      previous_loan_balance_system: simulatedSystemBalance,
      status: 'approved'
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedReq) return;
    try {
      const { error } = await supabase
        .from("cash_advances")
        .update({
            status: processForm.status,
            approved_amount: processForm.approved_amount,
            approved_deduction_amount: processForm.approved_deduction_amount,
            previous_loan_balance_system: processForm.previous_loan_balance_system,
            remaining_balance_end: calculatedRemaining,
            updated_at: new Date()
        })
        .eq("id", selectedReq.id);

      if (error) throw error;
      
      toast.success(`Status diperbarui: ${processForm.status.toUpperCase()}`);
      setIsDialogOpen(false);
      fetchRequests();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold">Manajemen Kasbon</h1>
            <p className="text-muted-foreground">Monitor pengajuan pinjaman karyawan.</p>
        </div>
      </div>

      <div className="rounded border bg-white shadow overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Tgl</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Diajukan</TableHead>
              <TableHead>Potongan</TableHead>
              <TableHead>Sisa Hutang (Akhir)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></TableCell></TableRow> :
            requests.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Tidak ada data.</TableCell></TableRow> :
            requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.request_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell>
                    <div className="font-bold">{r.crew?.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.crew?.outlets?.name}</div>
                </TableCell>
                <TableCell>{formatRp(r.request_amount)}</TableCell>
                <TableCell>{formatRp(r.request_deduction_amount)}</TableCell>
                <TableCell className="font-bold text-red-600">
                    {r.status === 'pending' ? '-' : formatRp(r.remaining_balance_end)}
                </TableCell>
                <TableCell>
                    {r.status === 'pending' && <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>}
                    {r.status === 'approved' && <Badge className="bg-green-600">Approved</Badge>}
                    {r.status === 'adjusted' && <Badge className="bg-blue-600">Adjusted</Badge>}
                    {r.status === 'declined' && <Badge variant="destructive">Declined</Badge>}
                </TableCell>
                <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openApproval(r)}>
                        Detail / Proses
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL APPROVAL ADMIN */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Proses Pengajuan: {selectedReq?.crew?.full_name}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
                
                {/* Info Request User */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded text-sm">
                    <div>
                        <p className="text-xs text-slate-500">Jumlah Diajukan:</p>
                        <p className="font-semibold">{selectedReq && formatRp(selectedReq.request_amount)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Potongan Diajukan:</p>
                        <p className="font-semibold">{selectedReq && formatRp(selectedReq.request_deduction_amount)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Sisa Hutang (Versi User):</p>
                        <p className="font-semibold">{selectedReq && formatRp(selectedReq.previous_loan_balance_user)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Alasan:</p>
                        <p className="italic text-slate-700 truncate">{selectedReq?.reason}</p>
                    </div>
                    {selectedReq?.document_url && (
                        <div className="col-span-2">
                            <a href={selectedReq.document_url} target="_blank" className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                                <FileText className="w-3 h-3"/> Lihat Dokumen Lampiran
                            </a>
                        </div>
                    )}
                </div>

                <div className="border-t my-2"></div>

                {/* Form Keputusan Admin */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Sisa Pinjaman Sebelumnya (System Check)</Label>
                        <Input 
                            type="number" 
                            className="bg-yellow-50 border-yellow-200"
                            value={processForm.previous_loan_balance_system}
                            onChange={(e) => setProcessForm({...processForm, previous_loan_balance_system: Number(e.target.value)})}
                        />
                        {selectedReq && processForm.previous_loan_balance_system != selectedReq.previous_loan_balance_user && (
                            <p className="text-[10px] text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Beda dengan input user</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Status Keputusan</Label>
                        <Select value={processForm.status} onValueChange={(val) => setProcessForm({...processForm, status: val})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="approved">Approved (Disetujui Penuh)</SelectItem>
                                <SelectItem value="adjusted">Adjusted (Disesuaikan)</SelectItem>
                                <SelectItem value="declined">Declined (Ditolak)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Kasbon Disetujui (Rp)</Label>
                        <Input 
                            type="number" 
                            value={processForm.approved_amount}
                            onChange={(e) => setProcessForm({...processForm, approved_amount: Number(e.target.value)})}
                            disabled={processForm.status === 'declined'}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Potongan Disetujui (Rp)</Label>
                        <Input 
                            type="number" 
                            value={processForm.approved_deduction_amount}
                            onChange={(e) => setProcessForm({...processForm, approved_deduction_amount: Number(e.target.value)})}
                            disabled={processForm.status === 'declined'}
                        />
                    </div>
                </div>

                {/* Kalkulasi Akhir */}
                <div className="bg-blue-50 p-3 rounded text-center border border-blue-200 mt-2">
                    <p className="text-xs text-blue-600 mb-1">Total Sisa Pinjaman (Akhir Bulan Ini)</p>
                    <p className="text-xl font-bold text-blue-900">{formatRp(calculatedRemaining)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">(Sisa Awal System + Kasbon Baru) - Potongan</p>
                </div>

            </div>
            <div className="flex justify-end pt-2 border-t gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button onClick={handleSave}>Simpan Keputusan</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}