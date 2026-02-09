"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Clock, CheckCircle2, XCircle, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CrewKasbonPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form Data Sesuai Request
  const [formData, setFormData] = useState({
      request_amount: "",
      request_deduction_amount: "",
      previous_loan_balance_user: "0", // User input sisa hutang
      reason: "",
      document_url: "",
      agreement_checked: false
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        const { data: crew } = await supabase.from('crew').select('id').eq('auth_user_id', user.id).single();
        if(crew) {
            const { data } = await supabase
                .from('cash_advances')
                .select('*')
                .eq('crew_id', crew.id)
                .order('created_at', {ascending: false});
            setHistory(data || []);
        }
    }
    setLoading(false);
  };

  // Mock Upload Function (Ganti dengan logic Storage Supabase jika bucket sudah ada)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      
      // Simulasi upload (Nanti ganti: supabase.storage.from('documents').upload(...) )
      setTimeout(() => {
          setFormData({ ...formData, document_url: "https://mock-url.com/file.pdf" });
          toast.success("Dokumen terlampir (Simulasi)");
          setUploading(false);
      }, 1000);
  };

  const handleSubmit = async () => {
    if(!formData.request_amount || !formData.reason) return toast.error("Mohon lengkapi data utama!");
    if(!formData.agreement_checked) return toast.error("Anda harus menyetujui pernyataan!");

    setSubmitting(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: crew } = await supabase.from('crew').select('id, email').eq('auth_user_id', user?.id).single();
        
        if(!crew) throw new Error("User tidak valid");

        const { error } = await supabase.from('cash_advances').insert({
            crew_id: crew.id,
            request_date: new Date().toISOString(), // Timestamp hari ini
            request_amount: Number(formData.request_amount),
            request_deduction_amount: Number(formData.request_deduction_amount),
            previous_loan_balance_user: Number(formData.previous_loan_balance_user),
            reason: formData.reason,
            document_url: formData.document_url,
            agreement_checked: formData.agreement_checked,
            status: 'pending' // Default status
        });

        if(error) throw error;
        
        toast.success("Pengajuan berhasil dikirim!");
        setIsOpen(false);
        setFormData({ 
            request_amount: "", request_deduction_amount: "", 
            previous_loan_balance_user: "0", reason: "", 
            document_url: "", agreement_checked: false 
        });
        fetchHistory();

    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setSubmitting(false);
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-4 pb-20">
        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
             <div>
                <h2 className="font-bold text-lg text-blue-900">Kasbon Saya</h2>
                <p className="text-xs text-blue-600">Ajukan pinjaman dan upload bukti</p>
             </div>
             <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shadow-sm"><Plus className="mr-1 h-4 w-4"/> Ajukan Baru</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Form Pengajuan Kasbon</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        
                        {/* INPUT: Jumlah Kasbon */}
                        <div className="space-y-2">
                            <Label>Jumlah Kasbon Diajukan (Rp)</Label>
                            <Input type="number" placeholder="0" value={formData.request_amount} onChange={e=>setFormData({...formData, request_amount: e.target.value})}/>
                        </div>

                        {/* INPUT: Potongan */}
                        <div className="space-y-2">
                            <Label>Jumlah Potongan Diajukan (Cicilan/Bln)</Label>
                            <Input type="number" placeholder="0" value={formData.request_deduction_amount} onChange={e=>setFormData({...formData, request_deduction_amount: e.target.value})}/>
                        </div>

                        {/* INPUT: Sisa Pinjaman Sebelumnya (User Version) */}
                        <div className="space-y-2">
                            <Label>Sisa Pinjaman Sebelumnya (Estimasi Anda)</Label>
                            <Input type="number" placeholder="0" value={formData.previous_loan_balance_user} onChange={e=>setFormData({...formData, previous_loan_balance_user: e.target.value})}/>
                            <p className="text-[10px] text-muted-foreground">Masukkan 0 jika tidak ada hutang sebelumnya.</p>
                        </div>

                        {/* INPUT: Alasan */}
                        <div className="space-y-2">
                            <Label>Alasan Pengajuan</Label>
                            <Textarea placeholder="Contoh: Keperluan mendesak..." value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})}/>
                        </div>

                        {/* INPUT: Upload Bukti */}
                        <div className="space-y-2">
                            <Label>Upload Bukti / Dokumen (Opsional)</Label>
                            <div className="flex items-center gap-2">
                                <Input type="file" onChange={handleFileUpload} disabled={uploading} className="text-xs"/>
                                {uploading && <Loader2 className="animate-spin h-4 w-4"/>}
                            </div>
                            {formData.document_url && <p className="text-xs text-green-600">File terlampir</p>}
                        </div>

                        {/* CHECKLIST: Persetujuan */}
                        <div className="flex items-start space-x-2 bg-yellow-50 p-3 rounded border border-yellow-100">
                            <Checkbox id="terms" checked={formData.agreement_checked} onCheckedChange={(c: boolean) => setFormData({...formData, agreement_checked: c})} />
                            <Label htmlFor="terms" className="text-xs text-yellow-800 leading-tight cursor-pointer">
                                Saya menyatakan data ini benar & setuju gaji dipotong sesuai kebijakan manajemen.
                            </Label>
                        </div>

                        <Button className="w-full" onClick={handleSubmit} disabled={submitting || !formData.agreement_checked}>
                            {submitting ? <Loader2 className="animate-spin mr-2"/> : null} Kirim Pengajuan
                        </Button>
                    </div>
                </DialogContent>
             </Dialog>
        </div>

        <h3 className="font-semibold text-sm text-slate-600 mt-6">Riwayat Pengajuan</h3>

        {loading ? <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-blue-500"/></div> : 
         history.length === 0 ? <p className="text-center text-muted-foreground py-10 text-sm">Belum ada riwayat kasbon.</p> :
         history.map(item => (
            <Card key={item.id} className="mb-3 shadow-sm border border-slate-100 hover:border-blue-200 transition-all">
                <CardContent className="p-4">
                    <div className="flex justify-between mb-3 border-b border-slate-50 pb-2">
                        <span className="text-xs text-slate-400 font-medium">{new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                        {item.status === 'pending' && <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Diproses</Badge>}
                        {item.status === 'approved' && <Badge className="bg-green-600">Disetujui</Badge>}
                        {item.status === 'adjusted' && <Badge className="bg-blue-600">Disetujui (Disesuaikan)</Badge>}
                        {item.status === 'declined' && <Badge variant="destructive">Ditolak</Badge>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Diajukan</p>
                            <p className="font-semibold text-slate-800">{formatRp(item.request_amount)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase">Disetujui</p>
                            <p className="font-bold text-blue-600">{item.status === 'pending' ? '-' : formatRp(item.approved_amount)}</p>
                        </div>
                    </div>
                    {/* Tampilkan Sisa Hutang Akhir jika sudah diapprove */}
                    {['approved', 'adjusted'].includes(item.status) && (
                        <div className="mt-2 pt-2 border-t border-dashed text-right">
                             <p className="text-[10px] text-muted-foreground">Sisa Pinjaman (Update)</p>
                             <p className="font-bold text-red-600">{formatRp(item.remaining_balance_end)}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
         ))
        }
    </div>
  );
}