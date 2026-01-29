"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, History } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CrewKasbonPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
      amount: "",
      reason: "",
      deduction_plan: ""
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        // Cari Crew ID
        const { data: crew } = await supabase.from('crew').select('id').eq('auth_user_id', user.id).single();
        if(crew) {
            const { data } = await supabase.from('cash_advances').select('*').eq('crew_id', crew.id).order('request_date', {ascending: false});
            setHistory(data || []);
        }
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if(!formData.amount || !formData.reason) return toast.error("Isi semua data!");
    
    setSubmitting(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: crew } = await supabase.from('crew').select('id').eq('auth_user_id', user?.id).single();
        
        if(!crew) throw new Error("User tidak valid");

        const { error } = await supabase.from('cash_advances').insert({
            crew_id: crew.id,
            amount: Number(formData.amount),
            reason: formData.reason,
            deduction_plan_amount: Number(formData.deduction_plan), // Usulan potongan
            request_date: new Date(),
            status: 'pending',
            remaining_amount: Number(formData.amount), // Awal
            agreement_statement: true
        });

        if(error) throw error;
        toast.success("Pengajuan dikirim!");
        setIsOpen(false);
        setFormData({ amount: "", reason: "", deduction_plan: "" });
        fetchHistory();

    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setSubmitting(false);
    }
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
             <h2 className="font-bold text-lg">Kasbon Saya</h2>
             <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button size="sm"><Plus className="mr-1 h-4 w-4"/> Ajukan</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Form Pengajuan Kasbon</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Jumlah Kasbon (Rp)</Label>
                            <Input type="number" placeholder="Contoh: 500000" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <Label>Sanggup Potong Gaji (Per Bulan)</Label>
                            <Input type="number" placeholder="Contoh: 250000" value={formData.deduction_plan} onChange={e=>setFormData({...formData, deduction_plan: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <Label>Alasan / Keperluan</Label>
                            <Textarea placeholder="Contoh: Biaya berobat keluarga" value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})}/>
                        </div>
                        <div className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded">
                            *Dengan mengajukan ini, saya setuju gaji saya dipotong sesuai kesepakatan.
                        </div>
                        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin"/> : "Kirim Pengajuan"}
                        </Button>
                    </div>
                </DialogContent>
             </Dialog>
        </div>

        {loading ? <div className="text-center py-4"><Loader2 className="animate-spin mx-auto"/></div> : 
         history.length === 0 ? <p className="text-center text-muted-foreground py-10">Belum ada riwayat kasbon.</p> :
         history.map(item => (
            <Card key={item.id} className="mb-2">
                <CardContent className="p-4">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{new Date(item.request_date).toLocaleDateString('id-ID')}</span>
                        {item.status === 'pending' && <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Diproses</Badge>}
                        {item.status === 'approved' && <Badge className="bg-green-600">Disetujui</Badge>}
                        {item.status === 'rejected' && <Badge variant="destructive">Ditolak</Badge>}
                        {item.status === 'paid_off' && <Badge className="bg-blue-100 text-blue-700">Lunas</Badge>}
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="font-bold text-lg">{formatRp(item.amount)}</p>
                            <p className="text-xs truncate max-w-[200px]">{item.reason}</p>
                        </div>
                        {item.status === 'approved' && (
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground">Sisa Hutang</p>
                                <p className="font-bold text-red-600">{formatRp(item.remaining_amount)}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
         ))
        }
    </div>
  );
}