"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, UserX, CheckCircle2, Pencil, Save, X } from "lucide-react"; // Icon UserX untuk Revoke
import { toast } from "sonner";

export default function CrewAccountsPage() {
  const [crews, setCrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // State untuk Edit Email Inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState("");

  useEffect(() => {
    fetchCrews();
  }, []);

  const fetchCrews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("crew")
      .select("id, full_name, email, role, auth_user_id, is_active")
      .order("full_name");
    if (data) setCrews(data);
    setLoading(false);
  };

  // --- FUNGSI UPDATE EMAIL ---
  const startEditing = (crew: any) => {
    setEditingId(crew.id);
    setTempEmail(crew.email || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempEmail("");
  };

  const saveEmail = async (id: string) => {
    if (!tempEmail.includes("@")) return toast.error("Format email tidak valid");
    
    const oldCrews = [...crews];
    setCrews(crews.map(c => c.id === id ? { ...c, email: tempEmail } : c));
    setEditingId(null);

    const { error } = await supabase.from('crew').update({ email: tempEmail }).eq('id', id);

    if (error) {
        toast.error("Gagal simpan email: " + error.message);
        setCrews(oldCrews);
    } else {
        toast.success("Email diperbarui");
    }
  };

  // --- FUNGSI GENERATE AKUN ---
  const handleGenerateAccount = async (crew: any) => {
    if (!crew.email) return toast.error("Email crew wajib diisi dulu!");
    
    setProcessing(crew.id);
    try {
      const defaultPassword = "balista123"; 

      const response = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: crew.email,
          password: defaultPassword,
          crew_id: crew.id,
          role: 'crew'
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success(`Akun dibuat! Email: ${crew.email}, Pass: ${defaultPassword}`);
      fetchCrews();
      
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(null);
    }
  };

  // --- FUNGSI CABUT AKSES (REVOKE) ---
  const handleRevokeAccount = async (crew: any) => {
    if (!confirm(`Yakin ingin mencabut akses login ${crew.full_name}? User tidak akan bisa login lagi.`)) return;

    setProcessing(crew.id);
    try {
        const response = await fetch("/api/auth/revoke-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                crew_id: crew.id,
                auth_user_id: crew.auth_user_id
            }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        toast.success("Akses berhasil dicabut!");
        fetchCrews(); // Refresh list agar status kembali ke "Belum Terdaftar"

    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manajemen Akun Karyawan</h1>
      <p className="text-muted-foreground">Generate atau cabut akses login dashboard karyawan.</p>

      <div className="rounded border bg-white shadow overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status Akun</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow> :
            crews.map((crew) => (
              <TableRow key={crew.id}>
                <TableCell className="font-medium">{crew.full_name}</TableCell>
                
                {/* --- KOLOM EMAIL EDITABLE --- */}
                <TableCell>
                    {editingId === crew.id ? (
                        <div className="flex items-center gap-2">
                            <Input 
                                value={tempEmail} 
                                onChange={(e) => setTempEmail(e.target.value)} 
                                className="h-8 w-[200px]"
                                placeholder="nama@email.com"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => saveEmail(crew.id)}>
                                <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={cancelEditing}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            {crew.email ? (
                                <span>{crew.email}</span>
                            ) : (
                                <span className="text-red-500 text-xs italic">Belum ada email</span>
                            )}
                            
                            {/* Tombol Edit muncul jika belum punya akun auth */}
                            {!crew.auth_user_id && (
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className={`h-6 w-6 text-slate-400 hover:text-blue-600 ${!crew.email ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    onClick={() => startEditing(crew)}
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    )}
                </TableCell>

                <TableCell>
                  {crew.auth_user_id ? (
                    <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Aktif</Badge>
                  ) : (
                    <Badge variant="outline">Belum Terdaftar</Badge>
                  )}
                </TableCell>
                
                {/* --- KOLOM AKSI --- */}
                <TableCell className="text-right">
                  {!crew.auth_user_id ? (
                    // KONDISI 1: Belum punya akun -> Tampilkan GENERATE
                    <Button 
                      size="sm" 
                      onClick={() => handleGenerateAccount(crew)} 
                      disabled={!!processing || !crew.email || editingId === crew.id} 
                    >
                      {processing === crew.id ? <Loader2 className="animate-spin w-4 h-4"/> : <UserPlus className="w-4 h-4 mr-2"/>}
                      Generate Akun
                    </Button>
                  ) : (
                    // KONDISI 2: Sudah punya akun -> Tampilkan CABUT AKSES
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRevokeAccount(crew)}
                        disabled={!!processing}
                    >
                        {processing === crew.id ? <Loader2 className="animate-spin w-4 h-4"/> : <UserX className="w-4 h-4 mr-2"/>}
                        Cabut Akses
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}