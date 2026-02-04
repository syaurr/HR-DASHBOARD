'use client';

import { useEffect, useState, useMemo, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient"; 
import { Crew, Outlet } from "@/types"; 
import { FileText, ExternalLink, Briefcase, CalendarDays } from "lucide-react"; 

// === SCHEMA VALIDASI ===
const formSchema = z.object({
    full_name: z.string().min(3, "Nama minimal 3 karakter"),
    email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
    phone_number: z.string().optional().or(z.literal("")),
    outlet_id: z.string().min(1, "Harap pilih outlet"),
    role: z.enum(["crew", "leader", "supervisor"]),
    gender: z.enum(["male", "female"]),
    bank_name: z.string().optional(),
    bank_account_number: z.string().optional(),
    address: z.string().optional(),
    skck_url: z.string().optional(),
    is_active: z.boolean(),
    join_date: z.string().optional(),
    resign_date: z.string().optional(),
    resign_reason: z.string().optional(),
});

// Helper Hitung Masa Kerja
const calculateDuration = (start: string | null, end: string | null) => {
    if (!start) return "-";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} Thn ${months} Bln`;
    return `${months} Bulan`;
};

export default function ManageCrewPage() {
    const [crewList, setCrewList] = useState<Crew[]>([]);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
    const [uploadingSkck, setUploadingSkck] = useState(false);

    // Filter
    const [showInactive, setShowInactive] = useState(false);
    const [filterOutlet, setFilterOutlet] = useState<string>("all");
    const [filterRole, setFilterRole] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"outlet" | "name" | "role">("outlet");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: "", email: "", phone_number: "", outlet_id: "", 
            role: "crew", gender: "male", bank_name: "", bank_account_number: "", 
            address: "", skck_url: "", is_active: true, join_date: "", resign_date: "", resign_reason: ""
        },
    });

    // PENTING: Watcher agar UI berubah real-time saat status diganti
    const isActive = form.watch("is_active");

    const processedCrew = useMemo(() => {
        let result = [...crewList];
        if (!showInactive) result = result.filter(c => c.is_active);
        if (filterOutlet !== "all") result = result.filter(c => c.outlet_id === filterOutlet);
        if (filterRole !== "all") result = result.filter(c => c.role === filterRole);

        result.sort((a, b) => {
            if (a.is_active !== b.is_active) return a.is_active ? -1 : 1; 
            if (sortBy === "outlet") return (a.outlets?.name || "Z").localeCompare(b.outlets?.name || "Z");
            if (sortBy === "role") {
                const roleOrder = { supervisor: 1, leader: 2, crew: 3 };
                return (roleOrder[a.role] || 9) - (roleOrder[b.role] || 9);
            }
            return a.full_name.localeCompare(b.full_name);
        });
        return result;
    }, [crewList, showInactive, filterOutlet, filterRole, sortBy]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [crewRes, outletsRes] = await Promise.all([
                fetch('/api/admin/crew', { cache: 'no-store' }), 
                fetch('/api/outlets', { cache: 'no-store' })
            ]);
            if (!crewRes.ok) throw new Error("Gagal load data.");
            setCrewList(await crewRes.json());
            setOutlets(await outletsRes.json());
        } catch (error: any) {
            toast.error("Error", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleUploadSKCK = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
        setUploadingSkck(true);
        try {
            const fileName = `skck-${Date.now()}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('documents').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
            form.setValue('skck_url', data.publicUrl);
            toast.success("SKCK Terupload");
        } catch (error: any) { toast.error("Gagal Upload", { description: error.message }); } finally { setUploadingSkck(false); }
    };

    const handleOpenDialog = (crew: Crew | null = null) => {
        setEditingCrew(crew);
        const defaults: z.infer<typeof formSchema> = {
            full_name: "", email: "", phone_number: "", outlet_id: "", 
            role: "crew", gender: "male", bank_name: "", bank_account_number: "", 
            address: "", skck_url: "", is_active: true, join_date: "", resign_date: "", resign_reason: ""
        };
        
        if (crew) {
            form.reset({
                ...defaults,
                full_name: crew.full_name,
                outlet_id: crew.outlet_id,
                role: crew.role as "crew" | "leader" | "supervisor",
                gender: crew.gender as "male" | "female",
                email: crew.email ?? "",
                phone_number: crew.phone_number ?? "",
                bank_name: crew.bank_name ?? "",
                bank_account_number: crew.bank_account_number ?? "",
                address: crew.address ?? "",
                skck_url: crew.skck_url ?? "",
                is_active: crew.is_active ?? true,
                join_date: crew.join_date ?? "",
                resign_date: crew.resign_date ?? "",
                resign_reason: crew.resign_reason ?? ""
            });
        } else {
            form.reset(defaults);
        }
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const method = editingCrew ? 'PATCH' : 'POST';
            const body = editingCrew ? JSON.stringify({ id: editingCrew.id, ...values }) : JSON.stringify(values);
            const response = await fetch('/api/admin/crew', { method, headers: { 'Content-Type': 'application/json' }, body });
            if (!response.ok) throw new Error((await response.json()).message);
            toast.success(`Data tersimpan.`);
            setIsDialogOpen(false);
            fetchData();
        } catch (error: any) { toast.error("Gagal", { description: error.message }); }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch('/api/admin/crew', { method: 'DELETE', body: JSON.stringify({ id }) });
            if (!response.ok) throw new Error("Gagal menghapus.");
            toast.success("Dihapus permanen");
            fetchData();
        } catch (error: any) { toast.error("Error", { description: error.message }); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold tracking-tight">Data Karyawan & Karir</h1>
                    <Button onClick={() => handleOpenDialog()}>+ Tambah Data</Button>
                </div>
                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Filter Outlet</Label>
                        <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                            <SelectTrigger><SelectValue placeholder="Semua Outlet" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Semua Outlet</SelectItem>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Filter Jabatan</Label>
                        <Select value={filterRole} onValueChange={setFilterRole}>
                            <SelectTrigger><SelectValue placeholder="Semua Jabatan" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Semua Jabatan</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="leader">Leader</SelectItem><SelectItem value="crew">Crew</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Urutkan</Label>
                        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="outlet">Outlet</SelectItem><SelectItem value="name">Nama</SelectItem><SelectItem value="role">Jabatan</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2 h-10">
                        <Checkbox id="show-inactive" checked={showInactive} onCheckedChange={(c) => setShowInactive(c as boolean)} />
                        <Label htmlFor="show-inactive" className="cursor-pointer">Tampilkan Non-aktif</Label>
                    </div>
                </div>
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead>Identitas</TableHead>
                            <TableHead>Outlet</TableHead>
                            <TableHead>Kontak</TableHead>
                            <TableHead>Masa Kerja</TableHead> 
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isLoading && processedCrew.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24 text-gray-500">Data tidak ditemukan.</TableCell></TableRow>}
                        
                        {processedCrew.map(crew => (
                            <TableRow key={crew.id} className={`hover:bg-gray-50 ${!crew.is_active ? 'bg-gray-100 opacity-70' : ''}`}>
                                <TableCell>
                                    <div className="font-semibold text-gray-900">{crew.full_name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{crew.role} • {crew.gender === 'male' ? 'L' : 'P'}</div>
                                    {crew.skck_url && (
                                        <a href={crew.skck_url} target="_blank" className="text-[10px] text-blue-600 underline flex items-center gap-1 mt-1">
                                            <FileText className="w-3 h-3"/> SKCK
                                        </a>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                        {crew.outlets?.name || 'N/A'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs">
                                    <div>{crew.phone_number || '-'}</div>
                                    {(crew.bank_name) && <div className="text-gray-500">{crew.bank_name}</div>}
                                </TableCell>
                                <TableCell className="text-xs">
                                    <div className="flex items-center gap-1 font-medium text-gray-700">
                                        <Briefcase className="w-3 h-3"/>
                                        {calculateDuration(crew.join_date, crew.resign_date)}
                                    </div>
                                    <div className="text-gray-400 mt-0.5 text-[10px]">
                                        {crew.join_date ? new Date(crew.join_date).toLocaleDateString('id-ID', {month:'short', year:'numeric'}) : '?'} - 
                                        {crew.resign_date ? new Date(crew.resign_date).toLocaleDateString('id-ID', {month:'short', year:'numeric'}) : 'Skrg'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {crew.is_active 
                                        ? <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">Aktif</span> 
                                        : <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold border border-gray-300">Resign</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(crew)}>Edit</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingCrew ? 'Edit Karyawan' : 'Input Karyawan'}</DialogTitle></DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* KOLOM 1: IDENTITAS */}
                                <div className="space-y-3 border p-3 rounded-lg bg-gray-50/50">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><FileText className="w-4 h-4"/> Identitas</h3>
                                    <FormField control={form.control} name="full_name" render={({ field }) => ( <FormItem><FormLabel>Nama</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="outlet_id" render={({ field }) => ( <FormItem><FormLabel>Outlet</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger></FormControl><SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Jabatan</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="crew">Crew</SelectItem><SelectItem value="leader">Leader</SelectItem><SelectItem value="supervisor">SPV</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">L</SelectItem><SelectItem value="female">P</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                    </div>
                                </div>

                                {/* KOLOM 2: KONTAK & BANK */}
                                <div className="space-y-3 border p-3 rounded-lg bg-gray-50/50">
                                    <h3 className="font-bold text-sm flex items-center gap-2"><Briefcase className="w-4 h-4"/> Kontak & Bank</h3>
                                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="phone_number" render={({ field }) => ( <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="bank_name" render={({ field }) => ( <FormItem><FormLabel>Bank</FormLabel><FormControl><Input placeholder="BCA" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="bank_account_number" render={({ field }) => ( <FormItem><FormLabel>No. Rek</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                    <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Alamat</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                </div>

                                {/* KOLOM 3: KARIR & STATUS */}
                                <div className="space-y-3 border p-3 rounded-lg bg-blue-50/30 border-blue-100">
                                    <h3 className="font-bold text-sm flex items-center gap-2 text-blue-700"><CalendarDays className="w-4 h-4"/> Status Karir</h3>
                                    
                                    <FormField control={form.control} name="join_date" render={({ field }) => ( 
                                        <FormItem>
                                            <FormLabel>Tanggal Masuk</FormLabel>
                                            <FormControl><Input type="date" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem> 
                                    )} />
                                    
                                    <FormField control={form.control} name="is_active" render={({ field }) => (
                                        <FormItem className="bg-white p-2 rounded border">
                                            <FormLabel>Status Aktif</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(val === 'true')} value={field.value ? 'true' : 'false'}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="true">✅ Masih Bekerja</SelectItem>
                                                    <SelectItem value="false">❌ Resign / Keluar</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />

                                    {/* LOGIKA CONDITIONAL RENDERING YANG SUDAH DIPERBAIKI (PAKAI VARIABLE isActive) */}
                                    {!isActive && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 bg-red-50 p-2 rounded border border-red-100">
                                            <FormField control={form.control} name="resign_date" render={({ field }) => ( 
                                                <FormItem>
                                                    <FormLabel className="text-red-600">Tanggal Resign</FormLabel>
                                                    <FormControl><Input type="date" {...field} className="border-red-200 focus:ring-red-500" /></FormControl>
                                                    <FormMessage />
                                                </FormItem> 
                                            )} />
                                            <FormField control={form.control} name="resign_reason" render={({ field }) => ( 
                                                <FormItem>
                                                    <FormLabel className="text-red-600">Alasan</FormLabel>
                                                    <FormControl><Input placeholder="Contoh: Pindah Domisili" {...field} className="border-red-200 focus:ring-red-500" /></FormControl>
                                                    <FormMessage />
                                                </FormItem> 
                                            )} />
                                        </div>
                                    )}

                                    <FormField control={form.control} name="skck_url" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Upload SKCK</FormLabel>
                                            <FormControl>
                                                <Input type="file" accept="image/*,.pdf" onChange={handleUploadSKCK} disabled={uploadingSkck} className="text-xs" />
                                            </FormControl>
                                            {field.value && <div className="text-xs text-green-600 mt-1">✓ Terlampir</div>}
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={uploadingSkck}>{uploadingSkck ? 'Uploading...' : 'Simpan Data'}</Button>
                            </DialogFooter>

                            {editingCrew && (
                                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                    <span className="text-xs text-red-400">Hapus Permanen (Data Sampah)</span>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 border-red-200">Hapus</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Hapus Data?</AlertDialogTitle><AlertDialogDescription>Data yang dihapus tidak bisa dikembalikan. Gunakan "Status: Non-aktif" untuk resign.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(editingCrew.id)} className="bg-red-600">Ya, Hapus</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}