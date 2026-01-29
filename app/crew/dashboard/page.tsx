"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PayslipDocument } from "@/components/pdf/PayslipDocument"; // Reuse komponen PDF

export default function CrewDashboard() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPayrolls();
  }, []);

  const fetchMyPayrolls = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Ambil ID Crew dulu
        const { data: crew } = await supabase.from('crew').select('id, full_name, bank_name, bank_account_number, role, outlet_id, outlets(name)').eq('auth_user_id', user.id).single();
        
        if (crew) {
            // Ambil Payrolls
            const { data: pay } = await supabase
                .from('payrolls')
                .select('*, assessment_periods(name)')
                .eq('crew_id', crew.id)
                .eq('status', 'finalized')
                .order('created_at', { ascending: false });

            // Gabungkan data agar siap cetak PDF
            const formatted = pay?.map(p => ({
                ...p,
                full_name: crew.full_name,
                role: crew.role,
                outlet_name: crew.outlets?.name,
                bank_name: crew.bank_name,
                account_number: crew.bank_account_number,
                period_name: p.assessment_periods?.name
            })) || [];
            
            setPayrolls(formatted);
        }
    }
    setLoading(false);
  };

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div className="space-y-4">
        <h2 className="font-bold text-lg">Riwayat Slip Gaji</h2>
        
        {loading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></div> : 
         payrolls.length === 0 ? <p className="text-center text-muted-foreground py-10">Belum ada slip gaji.</p> :
         
         payrolls.map((p) => (
            <Card key={p.id} className="shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base">{p.period_name}</CardTitle>
                            <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('id-ID')}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-muted-foreground">Take Home Pay</p>
                             <p className="font-bold text-blue-700">Rp {formatRp(p.net_salary)}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0 flex justify-end">
                    <PDFDownloadLink
                        document={<PayslipDocument data={p} />}
                        fileName={`Slip_${p.period_name}.pdf`}
                    >
                        {({ loading }) => (
                            <Button size="sm" variant="outline" className="w-full sm:w-auto" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                                Download PDF
                            </Button>
                        )}
                    </PDFDownloadLink>
                </CardContent>
            </Card>
         ))
        }
    </div>
  );
}