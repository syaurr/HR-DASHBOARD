"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdminCashAdvances() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({
    approved_amount: 0,
    deduction_plan_amount: 0,
    status: 'approved'
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cash_advances")
      .select(`
        *,
        crew:crew_id (full_name, outlets(name))
      `)
      .order("created_at", { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  };

  const openApproval = (req: any) => {
    setSelectedReq(req);
    setApproveForm({
      approved_amount: req.amount, // Default disetujui full
      deduction_plan_amount: req.deduction_plan_amount || req.amount, // Default sekali lunas
      status: 'approved'
    });
    setIsDialogOpen(true);
  };

  const handleProcess = async () => {
    if (!selectedReq) return;
    try {
      const { error } = await supabase
        .from("cash_advances")
        .update({
            status: approveForm.status,
            approved_amount: approveForm.status === 'approved' ? approveForm.approved_amount : 0,
            remaining_amount: approveForm.status === 'approved' ? approveForm.approved_amount : 0, // Awal sisa = approved
            deduction_plan_amount: approveForm.deduction_plan_amount
        })
        .eq("id", selectedReq.id);

      if (error) throw error;
      toast.success(`Pengajuan berhasil diproses: ${approveForm.status}`);
      setIsDialogOpen(false);
      fetchRequests();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manajemen Kasbon</h1>

      <div className="rounded border bg-white shadow overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Tgl Pengajuan</TableHead>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Jumlah Diajukan</TableHead>
              <TableHead>Disetujui</TableHead>
              <TableHead>Sisa Hutang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow> :
            requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.request_date).toLocaleDateString('id-ID')}</TableCell>
                <TableCell>
                    <div className="font-medium">{r.crew?.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.crew?.outlets?.name}</div>
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-xs" title={r.reason}>{r.reason}</TableCell>
                <TableCell>{formatRp(r.amount)}</TableCell>
                <TableCell className="font-bold text-blue-600">{r.approved_amount > 0 ? formatRp(r.approved_amount) : '-'}</TableCell>
                <TableCell className="text-red-600">{r.status === 'approved' ? formatRp(r.remaining_amount) : '-'}</TableCell>
                <TableCell>
                    {r.status === 'pending' && <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Menunggu</Badge>}
                    {r.status === 'approved' && <Badge className="bg-green-600">Disetujui</Badge>}
                    {r.status === 'rejected' && <Badge variant="destructive">Ditolak</Badge>}
                    {r.status === 'paid_off' && <Badge variant="secondary" className="bg-blue-100 text-blue-700">Lunas</Badge>}
                </TableCell>
                <TableCell className="text-right">
                    {r.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => openApproval(r)}>
                            Proses
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODAL APPROVAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Proses Pengajuan Kasbon</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="p-3 bg-slate-50 rounded text-sm mb-2">
                    <p><strong>Nama:</strong> {selectedReq?.crew?.full_name}</p>
                    <p><strong>Pengajuan:</strong> Rp {selectedReq && formatRp(selectedReq.amount)}</p>
                    <p><strong>Alasan:</strong> {selectedReq?.reason}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Jumlah Disetujui (Rp)</Label>
                        <Input 
                            type="number" 
                            value={approveForm.approved_amount} 
                            onChange={(e) => setApproveForm({...approveForm, approved_amount: Number(e.target.value)})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Potongan Per Bulan (Rp)</Label>
                        <Input 
                            type="number" 
                            value={approveForm.deduction_plan_amount} 
                            onChange={(e) => setApproveForm({...approveForm, deduction_plan_amount: Number(e.target.value)})}
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Keputusan</Label>
                    <div className="flex gap-2">
                        <Button 
                            variant={approveForm.status === 'approved' ? 'default' : 'outline'} 
                            className={approveForm.status === 'approved' ? 'bg-green-600' : ''}
                            onClick={() => setApproveForm({...approveForm, status: 'approved'})}
                        >
                            <CheckCircle className="mr-2 h-4 w-4"/> Setujui
                        </Button>
                        <Button 
                             variant={approveForm.status === 'rejected' ? 'destructive' : 'outline'} 
                             onClick={() => setApproveForm({...approveForm, status: 'rejected'})}
                        >
                            <XCircle className="mr-2 h-4 w-4"/> Tolak
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <Button onClick={handleProcess}>Simpan Keputusan</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}